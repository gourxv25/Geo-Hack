"""
Advanced News Ingestion Service

Pipeline:
Fetch -> Normalize -> Deduplicate -> Enrich -> Store -> Graph Update
"""
from __future__ import annotations

import asyncio
import hashlib
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
import feedparser
from dateutil import parser as date_parser
from loguru import logger

from app.config import settings
from app.ingestion.deduplicator import NewsDeduplicator
from app.ingestion.entity_extractor import NewsEntityExtractor
from app.ingestion.graph_updater import graph_updater


class NewsIngestor:
    """Service for ingesting near real-time global news from multiple sources."""

    def __init__(self):
        self.rss_feeds = settings.rss_feeds
        self.newsapi_key = settings.news_api_key

        self.gdelt_enabled = bool(getattr(settings, "GDELT_ENABLED", True))
        self.event_registry_key = getattr(settings, "EVENT_REGISTRY_API_KEY", None)

        self.fetch_timeout = int(getattr(settings, "NEWS_FETCH_TIMEOUT_SECONDS", 20))
        self.max_concurrent_fetches = int(getattr(settings, "NEWS_MAX_CONCURRENT_FETCHES", 8))
        self.max_concurrent_enrichment = int(getattr(settings, "NEWS_MAX_CONCURRENT_ENRICHMENT", 4))
        self.max_raw_text_chars = int(getattr(settings, "NEWS_MAX_RAW_TEXT_CHARS", 9000))
        self.batch_size = int(getattr(settings, "NEWS_BATCH_SIZE", 25))

        self.user_agent = "global-ontology-engine/2.0"
        self.fetch_semaphore = asyncio.Semaphore(self.max_concurrent_fetches)
        self.enrichment_semaphore = asyncio.Semaphore(self.max_concurrent_enrichment)

        self.deduplicator = NewsDeduplicator(
            similarity_threshold=float(getattr(settings, "NEWS_DEDUP_SIMILARITY_THRESHOLD", 0.86)),
            duplicate_ttl_seconds=int(getattr(settings, "NEWS_DEDUP_TTL_SECONDS", 6 * 60 * 60)),
        )
        self.entity_extractor = NewsEntityExtractor(
            max_raw_text_chars=self.max_raw_text_chars,
            max_llm_text_chars=int(getattr(settings, "NEWS_MAX_LLM_TEXT_CHARS", 2800)),
            use_llm_enrichment=bool(getattr(settings, "NEWS_USE_LLM_ENRICHMENT", False)),
        )

    async def ingest_all(
        self,
        limit_per_source: int = 50,
        keywords: Optional[List[str]] = None,
        country: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Ingest from all enabled sources with enrichment and graph updates.
        """
        start_ts = datetime.utcnow()
        source_failures: Dict[str, str] = {}
        source_counts: Dict[str, int] = {}

        fetched_articles, fetch_failures = await self._fetch_all_sources(
            limit_per_source=limit_per_source,
            keywords=keywords or [],
            country=country,
            category=category,
        )
        source_failures.update(fetch_failures)
        source_counts.update(self._count_by_source(fetched_articles))

        normalized_articles = [self._normalize_article(article) for article in fetched_articles]
        normalized_articles = [article for article in normalized_articles if article.get("url")]

        if not normalized_articles:
            logger.warning("No articles fetched from external feeds; using fallback mock records")
            normalized_articles = self._mock_articles(limit=min(limit_per_source, 5))

        deduplicated, dedup_metrics = await self.deduplicator.deduplicate(normalized_articles)
        logger.info(
            "Deduplication metrics: "
            f"input={dedup_metrics['input_count']} output={dedup_metrics['output_count']} "
            f"skip_url={dedup_metrics['skipped_by_url']} "
            f"skip_title={dedup_metrics['skipped_by_title_similarity']} "
            f"skip_cache={dedup_metrics['skipped_by_cache']}"
        )

        enriched_articles = await self._enrich_articles_chunked(deduplicated)
        persisted_count = await self.persist_to_neo4j(enriched_articles)

        total_seconds = round((datetime.utcnow() - start_ts).total_seconds(), 3)
        return {
            "total_articles": len(fetched_articles),
            "normalized_articles": len(normalized_articles),
            "unique_articles": len(deduplicated),
            "persisted_to_neo4j": persisted_count,
            "source_counts": source_counts,
            "sources": sorted({a.get("source", "Unknown") for a in deduplicated}),
            "source_failures": source_failures,
            "dedup_metrics": dedup_metrics,
            "processing_seconds": total_seconds,
            "ingested_at": datetime.utcnow().isoformat(),
            "articles": enriched_articles,
        }

    async def _fetch_all_sources(
        self,
        limit_per_source: int,
        keywords: List[str],
        country: Optional[str],
        category: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
        failures: Dict[str, str] = {}
        tasks = []

        connector = aiohttp.TCPConnector(limit=self.max_concurrent_fetches, ttl_dns_cache=300)
        timeout = aiohttp.ClientTimeout(total=self.fetch_timeout)
        headers = {"User-Agent": self.user_agent}

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=headers) as session:
            tasks.append(
                asyncio.create_task(self.ingest_from_rss(session=session, limit=limit_per_source))
            )
            tasks.append(
                asyncio.create_task(
                    self.ingest_from_newsapi(
                        session=session,
                        limit=limit_per_source,
                        keywords=keywords,
                        country=country,
                        category=category,
                    )
                )
            )
            tasks.append(
                asyncio.create_task(
                    self.ingest_from_gdelt(
                        session=session,
                        limit=limit_per_source,
                        keywords=keywords,
                        country=country,
                        category=category,
                    )
                )
            )
            tasks.append(
                asyncio.create_task(
                    self.ingest_from_eventregistry(
                        session=session,
                        limit=limit_per_source,
                        keywords=keywords,
                    )
                )
            )

            results = await asyncio.gather(*tasks, return_exceptions=True)

        all_articles: List[Dict[str, Any]] = []
        for index, result in enumerate(results):
            source_name = ["rss", "newsapi", "gdelt", "eventregistry"][index]
            if isinstance(result, Exception):
                failures[source_name] = str(result)
                logger.error(f"{source_name} ingestion failed: {result}")
                continue
            all_articles.extend(result)

        return all_articles, failures

    async def ingest_from_rss(
        self,
        session: aiohttp.ClientSession,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Parallel RSS ingestion."""
        feed_tasks = [
            asyncio.create_task(self._fetch_single_rss_feed(session, feed_url, limit))
            for feed_url in self.rss_feeds
        ]
        feed_results = await asyncio.gather(*feed_tasks, return_exceptions=True)

        articles: List[Dict[str, Any]] = []
        for result in feed_results:
            if isinstance(result, Exception):
                logger.error(f"RSS feed task failed: {result}")
                continue
            articles.extend(result)
        return articles

    async def _fetch_single_rss_feed(
        self,
        session: aiohttp.ClientSession,
        feed_url: str,
        limit: int,
    ) -> List[Dict[str, Any]]:
        async with self.fetch_semaphore:
            try:
                payload = await self._http_get_bytes(session, feed_url)
                feed = feedparser.parse(payload)
                source_name = feed.feed.get("title") or self._source_from_url(feed_url)
                entries = feed.entries[:limit]
                logger.info(f"RSS source={source_name} entries={len(entries)} url={feed_url}")

                parsed: List[Dict[str, Any]] = []
                for entry in entries:
                    item = self._parse_rss_entry(entry=entry, source_name=source_name)
                    if item:
                        parsed.append(item)
                return parsed
            except Exception as exc:
                logger.error(f"RSS parsing error source={feed_url}: {exc}")
                return []

    async def ingest_from_newsapi(
        self,
        session: aiohttp.ClientSession,
        limit: int = 50,
        keywords: Optional[List[str]] = None,
        country: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """NewsAPI ingestion with optional filters."""
        if not self.newsapi_key:
            return []

        keywords = keywords or []
        query = " OR ".join(keywords[:5]).strip()
        endpoint = "https://newsapi.org/v2/top-headlines"
        params: Dict[str, Any] = {
            "apiKey": self.newsapi_key,
            "pageSize": limit,
            "language": "en",
        }
        if query:
            params["q"] = query
        if country:
            params["country"] = country.lower()[:2]
        if category:
            params["category"] = category.lower()

        # everything endpoint works better when only query is present.
        if query and not country and not category:
            endpoint = "https://newsapi.org/v2/everything"
            params["sortBy"] = "publishedAt"
            params.pop("country", None)
            params.pop("category", None)

        try:
            data = await self._http_get_json(session, endpoint, params=params)
            if data.get("status") != "ok":
                raise RuntimeError(f"NewsAPI status={data.get('status')}")
            articles: List[Dict[str, Any]] = []
            for payload in data.get("articles", []):
                parsed = self._parse_newsapi_article(payload)
                if parsed:
                    articles.append(parsed)
            return articles
        except Exception as exc:
            logger.error(f"NewsAPI fetch failed: {exc}")
            return []

    async def ingest_from_gdelt(
        self,
        session: aiohttp.ClientSession,
        limit: int = 50,
        keywords: Optional[List[str]] = None,
        country: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        GDELT article ingestion (OSINT source).
        """
        if not self.gdelt_enabled:
            return []

        query_terms = list(keywords or [])
        if country:
            query_terms.append(country)
        if category:
            query_terms.append(category)
        query = " AND ".join(term for term in query_terms if term) or "geopolitics OR economy"

        params = {
            "query": query,
            "mode": "ArtList",
            "format": "json",
            "sort": "HybridRel",
            "maxrecords": min(limit, 250),
        }
        url = "https://api.gdeltproject.org/api/v2/doc/doc"
        try:
            data = await self._http_get_json(session, url, params=params)
            rows = data.get("articles", [])
            parsed: List[Dict[str, Any]] = []
            for row in rows:
                item = self._parse_gdelt_article(row)
                if item:
                    parsed.append(item)
            return parsed
        except Exception as exc:
            logger.error(f"GDELT fetch failed: {exc}")
            return []

    async def ingest_from_eventregistry(
        self,
        session: aiohttp.ClientSession,
        limit: int = 50,
        keywords: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Optional EventRegistry source; skipped when key is not configured."""
        if not self.event_registry_key:
            return []

        # A tolerant payload: unsupported fields are ignored by API.
        payload: Dict[str, Any] = {
            "apiKey": self.event_registry_key,
            "resultType": "articles",
            "articlesPage": 1,
            "articlesCount": min(limit, 100),
            "articlesSortBy": "date",
            "lang": "eng",
        }
        if keywords:
            payload["keyword"] = " OR ".join(keywords[:5])

        url = "https://eventregistry.org/api/v1/article/getArticles"
        try:
            data = await self._http_post_json(session, url=url, payload=payload)
            rows = (
                data.get("articles", {}).get("results")
                or data.get("articles", [])
                or []
            )
            parsed: List[Dict[str, Any]] = []
            for row in rows:
                item = self._parse_eventregistry_article(row)
                if item:
                    parsed.append(item)
            return parsed
        except Exception as exc:
            logger.error(f"EventRegistry fetch failed: {exc}")
            return []

    async def _http_get_bytes(
        self,
        session: aiohttp.ClientSession,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        retries: int = 2,
    ) -> bytes:
        for attempt in range(retries + 1):
            try:
                async with session.get(url, params=params) as response:
                    response.raise_for_status()
                    return await response.read()
            except Exception:
                if attempt >= retries:
                    raise
                await asyncio.sleep(0.5 * (attempt + 1))
        return b""

    async def _http_get_json(
        self,
        session: aiohttp.ClientSession,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        retries: int = 2,
    ) -> Dict[str, Any]:
        payload = await self._http_get_bytes(session=session, url=url, params=params, retries=retries)
        text = payload.decode("utf-8", errors="ignore")
        import json

        return json.loads(text) if text else {}

    async def _http_post_json(
        self,
        session: aiohttp.ClientSession,
        url: str,
        payload: Dict[str, Any],
        retries: int = 2,
    ) -> Dict[str, Any]:
        import json

        for attempt in range(retries + 1):
            try:
                async with session.post(url, json=payload) as response:
                    response.raise_for_status()
                    text = await response.text()
                    return json.loads(text) if text else {}
            except Exception:
                if attempt >= retries:
                    raise
                await asyncio.sleep(0.5 * (attempt + 1))
        return {}

    def _normalize_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        title = (article.get("title") or "Untitled").strip()
        description = (article.get("description") or article.get("summary") or "").strip()
        raw_text = (article.get("raw_text") or article.get("content") or description).strip()
        raw_text = self._strip_html(raw_text)[: self.max_raw_text_chars]
        url = (article.get("url") or "").strip()
        source = article.get("source") or "Unknown"
        published_at = self._safe_iso_date(article.get("published_at"))

        categories = article.get("categories") or []
        if not isinstance(categories, list):
            categories = [str(categories)]
        categories = [str(c).strip() for c in categories if str(c).strip()]
        if not categories:
            categories = [self._infer_primary_category(title=title, description=description)]

        article_id = article.get("id")
        if not article_id:
            article_id = hashlib.sha1((url or title).encode("utf-8")).hexdigest()[:20]

        return {
            "id": article_id,
            "title": title,
            "description": description[:1200],
            "summary": description[:700],
            "source": source,
            "url": url,
            "published_at": published_at,
            "location": article.get("location") or {"name": "Global", "lat": None, "lon": None},
            "raw_text": raw_text,
            "content": raw_text,
            "categories": categories,
            "source_type": article.get("source_type", "unknown"),
            "author": article.get("author"),
            "ingested_at": datetime.utcnow().isoformat(),
            "status": "pending",
        }

    async def _enrich_articles_chunked(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not articles:
            return []

        enriched: List[Dict[str, Any]] = []
        for offset in range(0, len(articles), self.batch_size):
            chunk = articles[offset: offset + self.batch_size]
            tasks = [asyncio.create_task(self._enrich_single_article(article)) for article in chunk]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for article, result in zip(chunk, results):
                if isinstance(result, Exception):
                    logger.error(f"Enrichment failed url={article.get('url')}: {result}")
                    article["sentiment"] = "neutral"
                    article["sentiment_score"] = 0.0
                    article["entities"] = []
                    article["topic"] = self._infer_primary_category(
                        title=article.get("title", ""),
                        description=article.get("description", ""),
                    )
                    article["source_credibility"] = 0.6
                    article["confidence_score"] = 0.4
                    article["event_key"] = hashlib.sha1(
                        f"{article.get('title')}::{article.get('published_at')}".encode("utf-8")
                    ).hexdigest()[:24]
                    enriched.append(article)
                else:
                    enriched.append(result)
        return enriched

    async def _enrich_single_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        async with self.enrichment_semaphore:
            return await self.entity_extractor.enrich_article(article)

    async def persist_to_neo4j(self, articles: List[Dict[str, Any]]) -> int:
        if not articles:
            return 0
        persisted_count = 0
        for article in articles:
            try:
                await graph_updater.upsert_article_event(article)
                persisted_count += 1
            except Exception as exc:
                logger.error(f"Graph update failed url={article.get('url')}: {exc}")
        return persisted_count

    def _parse_rss_entry(self, entry: Any, source_name: str) -> Optional[Dict[str, Any]]:
        try:
            title = getattr(entry, "title", "Untitled")
            description = getattr(entry, "summary", "") or getattr(entry, "description", "")
            categories = []
            if hasattr(entry, "tags"):
                categories = [tag.term for tag in entry.tags if getattr(tag, "term", None)]
            published_at = self._safe_iso_date(getattr(entry, "published", None))
            link = getattr(entry, "link", "")
            return {
                "title": self._strip_html(title),
                "description": self._strip_html(description),
                "source": source_name,
                "url": link,
                "published_at": published_at,
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": f"{title}. {self._strip_html(description)}",
                "categories": categories,
                "source_type": "rss",
            }
        except Exception as exc:
            logger.error(f"RSS entry parsing failed: {exc}")
            return None

    def _parse_newsapi_article(self, article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            source = article.get("source", {}).get("name", "NewsAPI")
            title = article.get("title") or "Untitled"
            description = article.get("description") or article.get("content") or ""
            return {
                "title": self._strip_html(title),
                "description": self._strip_html(description),
                "source": source,
                "url": article.get("url", ""),
                "published_at": self._safe_iso_date(article.get("publishedAt")),
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": self._strip_html(article.get("content") or description),
                "categories": [self._infer_primary_category(title, description)],
                "author": article.get("author"),
                "source_type": "newsapi",
            }
        except Exception as exc:
            logger.error(f"NewsAPI article parsing failed: {exc}")
            return None

    def _parse_gdelt_article(self, article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            title = article.get("title") or "Untitled"
            excerpt = article.get("seendate") or article.get("socialimage") or ""
            url = article.get("url") or article.get("sourceurl") or ""
            if not url:
                return None
            source = article.get("domain") or "GDELT"
            return {
                "title": self._strip_html(title),
                "description": self._strip_html(article.get("snippet") or excerpt),
                "source": source,
                "url": url,
                "published_at": self._safe_iso_date(article.get("seendate")),
                "location": {"name": article.get("sourcecountry") or "Global", "lat": None, "lon": None},
                "raw_text": self._strip_html(article.get("snippet") or title),
                "categories": [self._infer_primary_category(title, article.get("snippet", ""))],
                "source_type": "gdelt",
            }
        except Exception as exc:
            logger.error(f"GDELT article parsing failed: {exc}")
            return None

    def _parse_eventregistry_article(self, article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            title = article.get("title") or "Untitled"
            body = article.get("body") or article.get("summary") or ""
            source = (article.get("source") or {}).get("title") or "EventRegistry"
            url = article.get("url") or ""
            if not url:
                return None
            categories = []
            for category in article.get("categories", []) or []:
                label = category.get("label") if isinstance(category, dict) else str(category)
                if label:
                    categories.append(label)
            return {
                "title": self._strip_html(title),
                "description": self._strip_html(body[:1200]),
                "source": source,
                "url": url,
                "published_at": self._safe_iso_date(article.get("date")),
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": self._strip_html(body),
                "categories": categories,
                "source_type": "eventregistry",
            }
        except Exception as exc:
            logger.error(f"EventRegistry article parsing failed: {exc}")
            return None

    def _infer_primary_category(self, title: str, description: str) -> str:
        text = f"{title} {description}".lower()
        mapping = {
            "Politics": ("election", "government", "minister", "president", "parliament"),
            "Economics": ("economy", "inflation", "gdp", "market", "trade"),
            "Defense": ("military", "war", "missile", "defense", "conflict"),
            "Technology": ("ai", "software", "chip", "cyber", "tech"),
            "Climate": ("climate", "flood", "wildfire", "storm", "temperature"),
            "Energy": ("oil", "gas", "solar", "wind", "power"),
            "Health": ("health", "hospital", "vaccine", "virus", "disease"),
        }
        for category, keywords in mapping.items():
            if any(keyword in text for keyword in keywords):
                return category
        return "General"

    def _strip_html(self, html: str) -> str:
        return re.sub(r"<[^>]+>", "", html or "")

    def _safe_iso_date(self, value: Optional[str]) -> str:
        if not value:
            return datetime.utcnow().isoformat()
        try:
            return date_parser.parse(value).isoformat()
        except Exception:
            return datetime.utcnow().isoformat()

    def _source_from_url(self, url: str) -> str:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        host = parsed.netloc.lower().replace("www.", "")
        return host.split("/")[0] or "Unknown"

    def _count_by_source(self, articles: List[Dict[str, Any]]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for article in articles:
            source = article.get("source", "Unknown")
            counts[source] = counts.get(source, 0) + 1
        return counts

    def _mock_articles(self, limit: int = 3) -> List[Dict[str, Any]]:
        now = datetime.utcnow().isoformat()
        return [
            {
                "id": "mock-1",
                "title": "Synthetic Global Briefing",
                "description": "Fallback article generated because external sources were unavailable.",
                "summary": "Fallback article generated because external sources were unavailable.",
                "source": "SampleSource",
                "url": "https://example.local/news/mock-1",
                "published_at": now,
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": "Synthetic fallback content for resilience testing.",
                "content": "Synthetic fallback content for resilience testing.",
                "categories": ["General"],
                "source_type": "mock",
                "ingested_at": now,
                "status": "pending",
            },
            {
                "id": "mock-2",
                "title": "Synthetic Economic Update",
                "description": "Fallback economics signal for local/offline development.",
                "summary": "Fallback economics signal for local/offline development.",
                "source": "SampleSource",
                "url": "https://example.local/news/mock-2",
                "published_at": now,
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": "Economic scenario fallback record.",
                "content": "Economic scenario fallback record.",
                "categories": ["Economics"],
                "source_type": "mock",
                "ingested_at": now,
                "status": "pending",
            },
            {
                "id": "mock-3",
                "title": "Synthetic Conflict Tracker",
                "description": "Fallback conflict update for graph continuity.",
                "summary": "Fallback conflict update for graph continuity.",
                "source": "SampleSource",
                "url": "https://example.local/news/mock-3",
                "published_at": now,
                "location": {"name": "Global", "lat": None, "lon": None},
                "raw_text": "Conflict scenario fallback record.",
                "content": "Conflict scenario fallback record.",
                "categories": ["Defense"],
                "source_type": "mock",
                "ingested_at": now,
                "status": "pending",
            },
        ][: max(1, limit)]


news_ingestor = NewsIngestor()

