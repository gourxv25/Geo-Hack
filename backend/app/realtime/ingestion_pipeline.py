from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.ingestion.pipeline import ingestion_pipeline
from app.realtime.event_producer import redis_event_producer

logger = logging.getLogger(__name__)


class RealtimeIngestionPipeline:
    """Compatibility wrapper around the modular ingestion pipeline."""

    async def run_once(self, limit_per_source: int = 50, category: Optional[str] = None) -> Dict[str, Any]:
        result = await ingestion_pipeline.run_once(limit_per_source=limit_per_source, category=category)
        persisted_to_postgres = 0

        # Keep realtime pipeline backward compatible while ensuring DB persistence.
        try:
            from app.api.endpoints.news import (
                _ensure_articles_table,
                _normalize_article,
                _persist_articles_to_postgres,
            )

            normalized = [_normalize_article(article) for article in result.get("articles", [])]
            if normalized:
                await _ensure_articles_table()
                await _persist_articles_to_postgres(normalized)
                persisted_to_postgres = len(normalized)
        except Exception as exc:
            logger.error("[ERROR] Realtime PostgreSQL persistence failed: %s", exc)

        published_count = 0
        for article in result.get("articles", []):
            published = await redis_event_producer.publish_article_event(article)
            if published:
                published_count += 1

        result["published_events"] = published_count
        result["persisted_to_postgres"] = persisted_to_postgres
        return result


realtime_ingestion_pipeline = RealtimeIngestionPipeline()
