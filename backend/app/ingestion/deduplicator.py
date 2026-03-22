"""
News deduplication utilities.

Pipeline:
1. URL canonicalization + hashing
2. In-memory near-duplicate filtering using title similarity
3. Redis-backed short-term duplicate cache to avoid reprocessing
"""
from __future__ import annotations

import hashlib
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from loguru import logger

from app.database.redis_client import redis_client


class NewsDeduplicator:
    """Deduplicate articles by URL and title similarity."""

    def __init__(
        self,
        similarity_threshold: float = 0.86,
        duplicate_ttl_seconds: int = 6 * 60 * 60,
    ):
        self.similarity_threshold = similarity_threshold
        self.duplicate_ttl_seconds = duplicate_ttl_seconds
        self._ignored_query_params = {
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "gclid",
            "fbclid",
        }

    def canonicalize_url(self, url: str) -> str:
        """Normalize URL so semantically same links resolve to the same hash."""
        if not url:
            return ""
        try:
            parts = urlsplit(url.strip())
            query_items = [
                (k, v)
                for k, v in parse_qsl(parts.query, keep_blank_values=True)
                if k.lower() not in self._ignored_query_params
            ]
            normalized_query = urlencode(sorted(query_items))
            normalized_path = (parts.path or "/").rstrip("/") or "/"
            return urlunsplit(
                (
                    parts.scheme.lower(),
                    parts.netloc.lower(),
                    normalized_path,
                    normalized_query,
                    "",  # drop fragments
                )
            )
        except Exception:
            return url.strip()

    def compute_url_hash(self, url: str) -> str:
        canonical = self.canonicalize_url(url)
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def _normalize_title(self, title: str) -> str:
        if not title:
            return ""
        cleaned = " ".join(title.lower().split())
        return cleaned[:500]

    def title_similarity(self, title_a: str, title_b: str) -> float:
        return SequenceMatcher(
            None,
            self._normalize_title(title_a),
            self._normalize_title(title_b),
        ).ratio()

    async def _seen_recently(self, url_hash: str) -> bool:
        if not url_hash:
            return False
        key = f"news:seen:url:{url_hash}"
        try:
            exists = await redis_client.exists(key)
            return bool(exists)
        except Exception as exc:
            logger.warning(f"Redis duplicate-check failed: {exc}")
            return False

    async def _mark_seen(self, url_hash: str) -> None:
        if not url_hash:
            return
        key = f"news:seen:url:{url_hash}"
        try:
            await redis_client.set(key, "1", expire=self.duplicate_ttl_seconds)
        except Exception as exc:
            logger.warning(f"Redis duplicate mark failed: {exc}")

    async def deduplicate(
        self,
        articles: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        """
        Return (unique_articles, metrics).

        Metrics:
        - input_count
        - skipped_by_url
        - skipped_by_title_similarity
        - skipped_by_cache
        - output_count
        """
        unique: List[Dict[str, Any]] = []
        seen_hashes = set()
        unique_titles: List[str] = []

        skipped_by_url = 0
        skipped_by_title_similarity = 0
        skipped_by_cache = 0

        for article in articles:
            url_hash = self.compute_url_hash(article.get("url", ""))
            article["url_hash"] = url_hash

            if url_hash and url_hash in seen_hashes:
                skipped_by_url += 1
                continue

            if await self._seen_recently(url_hash):
                skipped_by_cache += 1
                continue

            title = article.get("title", "")
            is_similar = any(
                self.title_similarity(title, existing_title) >= self.similarity_threshold
                for existing_title in unique_titles
            )
            if is_similar:
                skipped_by_title_similarity += 1
                continue

            if url_hash:
                seen_hashes.add(url_hash)
            unique_titles.append(title)
            unique.append(article)

        for article in unique:
            await self._mark_seen(article.get("url_hash", ""))

        metrics = {
            "input_count": len(articles),
            "skipped_by_url": skipped_by_url,
            "skipped_by_title_similarity": skipped_by_title_similarity,
            "skipped_by_cache": skipped_by_cache,
            "output_count": len(unique),
        }
        return unique, metrics

