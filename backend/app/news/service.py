from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from dateutil import parser as date_parser

from app.news.repository import news_repository


class NewsService:
    def _parse_datetime(self, value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            parsed = date_parser.parse(value)
            if parsed.tzinfo is not None:
                parsed = parsed.replace(tzinfo=None)
            return parsed
        except Exception:
            return None

    def _normalize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        published = row.get("published_at")
        categories = row.get("categories", []) or []
        entities = row.get("entities", []) or []
        if isinstance(categories, str):
            try:
                categories = json.loads(categories)
            except Exception:
                categories = []
        if isinstance(entities, str):
            try:
                entities = json.loads(entities)
            except Exception:
                entities = []

        published_at = (
            published.isoformat()
            if isinstance(published, datetime)
            else str(published or datetime.utcnow().isoformat())
        )
        return {
            "id": str(row.get("id", "")),
            "title": row.get("title", "Untitled"),
            "summary": row.get("summary", ""),
            "content": row.get("content"),
            "source": row.get("source", "Unknown"),
            "url": row.get("url", ""),
            "published_at": published_at,
            "timestamp": published_at,
            "categories": categories,
            "entities": entities,
            "domain": row.get("domain"),
            "region": row.get("region", "Global"),
            "sentiment": row.get("sentiment"),
            "relevance_score": row.get("relevance_score"),
            "source_credibility": row.get("source_credibility"),
            "event_key": row.get("event_key"),
        }

    async def list_news(
        self,
        *,
        start_date: Optional[str],
        end_date: Optional[str],
        category: Optional[str],
        region: Optional[str],
        page: int,
        limit: int,
        cursor: Optional[str],
    ) -> Dict[str, Any]:
        rows, total, next_cursor = await news_repository.list_news(
            start_date=self._parse_datetime(start_date),
            end_date=self._parse_datetime(end_date),
            category=(category or "").strip() or None,
            region=(region or "").strip() or None,
            page=page,
            limit=limit,
            cursor=cursor,
        )
        normalized = [self._normalize_row(row) for row in rows]
        return {
            "articles": normalized,
            "next_cursor": next_cursor,
            "total": total,
        }

    async def get_news_by_id(self, news_id: str) -> Optional[Dict[str, Any]]:
        row = await news_repository.get_news_by_id(news_id)
        if row is None:
            return None
        normalized = self._normalize_row(row)
        content = normalized.get("content") or normalized.get("summary") or "Full content not available."
        return {
            "id": normalized["id"],
            "title": normalized["title"],
            "content": str(content),
            "source": normalized["source"],
            "timestamp": normalized["published_at"],
            "summary": normalized.get("summary", ""),
            "url": normalized.get("url", ""),
            "categories": normalized.get("categories", []),
            "region": normalized.get("region", "Global"),
        }


news_service = NewsService()
