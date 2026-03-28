from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Sequence

from app.config import settings
from app.ingestion.news_ingestor import FeedSource, news_ingestor
from app.ingestion.pipeline import ingestion_pipeline
from app.ingestion.sources.rss_sources import RSSFeedSource
from app.realtime.event_producer import redis_event_producer

logger = logging.getLogger(__name__)


def create_batches(feeds: Sequence[FeedSource], batch_size: int = 20) -> List[List[FeedSource]]:
    """Split feeds into fixed-size batches."""
    safe_batch_size = max(10, min(20, int(batch_size)))
    return [list(feeds[i:i + safe_batch_size]) for i in range(0, len(feeds), safe_batch_size)]


async def _process_batch(
    batch: Sequence[FeedSource],
    limit_per_source: int,
) -> Dict[str, Any]:
    """Process one batch using the existing ingestion components."""
    rss_feeds = [RSSFeedSource(name=f.name, url=f.url, category=f.category) for f in batch]
    rss_payloads, source_failures = await ingestion_pipeline.rss_client.fetch_all(rss_feeds)

    rss_articles: List[Dict[str, Any]] = []
    for feed, payload in rss_payloads:
        parsed = ingestion_pipeline.parser.parse_rss_payload(
            feed.name,
            feed.category,
            payload,
            limit_per_source,
        )
        rss_articles.extend(parsed)
        logger.info("[RSS] Success: %s articles (%s)", len(parsed), feed.name)

    unique_articles, dedup_metrics = await ingestion_pipeline.deduplicator.deduplicate(rss_articles)
    normalized_articles = news_ingestor.normalize_articles(unique_articles)
    enriched_articles = await ingestion_pipeline._enrich_articles(normalized_articles)
    persisted_to_neo4j = await news_ingestor.store_in_neo4j(enriched_articles)

    persisted_to_postgres = 0
    try:
        # Reuse existing DB persistence path without changing its behavior.
        from app.api.endpoints.news import (
            _ensure_articles_table,
            _normalize_article,
            _persist_articles_to_postgres,
        )

        normalized = [_normalize_article(article) for article in enriched_articles]
        if normalized:
            await _ensure_articles_table()
            await _persist_articles_to_postgres(normalized)
            persisted_to_postgres = len(normalized)
    except Exception as exc:
        logger.error("[ERROR] Cyclic PostgreSQL persistence failed: %s", exc)

    published_events = 0
    for article in enriched_articles:
        published = await redis_event_producer.publish_article_event(article)
        if published:
            published_events += 1

    return {
        "feeds_processed": len(batch),
        "articles_fetched": len(rss_articles),
        "unique_articles": len(enriched_articles),
        "persisted_to_neo4j": persisted_to_neo4j,
        "persisted_to_postgres": persisted_to_postgres,
        "published_events": published_events,
        "source_failures": source_failures,
        "dedup_metrics": dedup_metrics,
    }


async def start_cyclic_ingestion(stop_event: asyncio.Event) -> None:
    """
    Run RSS ingestion in cyclic batches forever until stop_event is set.
    - 10-20 feeds per batch
    - wait interval between batches
    - restart from first batch after full pass
    """
    batch_size = max(10, min(20, int(getattr(settings, "CYCLIC_INGESTION_BATCH_SIZE", 20))))
    interval_seconds = max(30, int(getattr(settings, "CYCLIC_INGESTION_INTERVAL_SECONDS", 120)))
    limit_per_source = max(1, int(getattr(settings, "NEWS_BATCH_LIMIT_PER_SOURCE", settings.startup_ingestion_limit)))

    while not stop_event.is_set():
        try:
            feeds = news_ingestor.load_feeds()
            if not feeds:
                logger.warning("[CYCLE] No feeds loaded. Sleeping for %s seconds", interval_seconds)
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
                except asyncio.TimeoutError:
                    pass
                continue

            batches = create_batches(feeds, batch_size=batch_size)
            total_batches = len(batches)
            logger.info("[CYCLE] Starting new cycle (%s feeds, %s batches)", len(feeds), total_batches)

            for idx, batch in enumerate(batches, start=1):
                if stop_event.is_set():
                    break

                logger.info("[BATCH] Processing batch %s/%s", idx, total_batches)
                started = datetime.now(timezone.utc)
                try:
                    result = await _process_batch(batch, limit_per_source=limit_per_source)
                    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
                    logger.info(
                        "[BATCH] Completed batch %s/%s in %.2fs | fetched=%s unique=%s neo4j=%s postgres=%s ws=%s",
                        idx,
                        total_batches,
                        elapsed,
                        result.get("articles_fetched", 0),
                        result.get("unique_articles", 0),
                        result.get("persisted_to_neo4j", 0),
                        result.get("persisted_to_postgres", 0),
                        result.get("published_events", 0),
                    )
                except Exception as exc:
                    logger.error("[BATCH] Failed batch %s/%s: %s", idx, total_batches, exc)

                if stop_event.is_set():
                    break

                logger.info("[WAIT] Sleeping for %s seconds", interval_seconds)
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
                except asyncio.TimeoutError:
                    pass
        except Exception as exc:
            logger.error("[CYCLE] Unexpected cyclic ingestion error: %s", exc)
            # Fault tolerance: never stop loop on failure.
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=10)
            except asyncio.TimeoutError:
                pass

