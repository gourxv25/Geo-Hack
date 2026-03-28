"""
Graph updater that maps enriched news to ontology-compatible Neo4j nodes.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from loguru import logger

from app.database.neo4j_client import neo4j_client


class GraphUpdater:
    """Upsert Event-centric graph structures from enriched articles."""

    def __init__(self):
        self._schema_initialized = False

    async def upsert_article_event(self, article: Dict[str, Any]) -> Dict[str, Any]:
        if not self._schema_initialized:
            await self._ensure_schema()
            self._schema_initialized = True

        await self._upsert_base_nodes(article)
        await self._upsert_location(article)
        await self._upsert_organizations(article)
        await self._upsert_people(article)
        await self._upsert_related_events(article)
        return {
            "event_key": article.get("event_key"),
            "url": article.get("url"),
            "updated_at": datetime.utcnow().isoformat(),
        }

    async def _ensure_schema(self) -> None:
        """Idempotent schema setup to keep MERGE operations efficient."""
        schema_queries = [
            "CREATE CONSTRAINT article_url_unique IF NOT EXISTS FOR (a:Article) REQUIRE a.url IS UNIQUE",
            "CREATE CONSTRAINT source_name_unique IF NOT EXISTS FOR (s:Source) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT event_key_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.event_key IS UNIQUE",
            "CREATE INDEX entity_name_idx IF NOT EXISTS FOR (e:Entity) ON (e.name)",
            "CREATE INDEX event_timestamp_idx IF NOT EXISTS FOR (e:Event) ON (e.timestamp)",
        ]
        for query in schema_queries:
            try:
                await neo4j_client.execute_write(query)
            except Exception as exc:
                logger.warning(f"Schema setup warning: {exc}")

    async def _upsert_base_nodes(self, article: Dict[str, Any]) -> None:
        query = """
        MERGE (a:Article {url: $url})
        ON CREATE SET a.created_at = datetime()
        SET a.title = $title,
            a.summary = $description,
            a.raw_text = $raw_text,
            a.published_at = $published_at,
            a.updated_at = datetime(),
            a.source = $source

        MERGE (s:Source {name: $source})
        ON CREATE SET s.created_at = datetime()
        SET s.last_seen_at = datetime(),
            s.credibility = $source_credibility

        MERGE (a)-[:PUBLISHED_BY]->(s)

        MERGE (ev:Entity:Event {event_key: $event_key})
        ON CREATE SET ev.created_at = datetime()
        SET ev.name = coalesce(ev.name, $event_name),
            ev.title = $title,
            ev.summary = $description,
            ev.timestamp = $published_at,
            ev.topic = $topic,
            ev.sentiment = $sentiment,
            ev.sentiment_score = $sentiment_score,
            ev.confidence = $confidence_score,
            ev.source_credibility = $source_credibility,
            ev.updated_at = datetime()

        MERGE (ev)-[:HAS_ARTICLE]->(a)
        MERGE (ev)-[:REPORTED_BY]->(s)
        """
        await neo4j_client.execute_write(
            query,
            url=article.get("url"),
            title=article.get("title"),
            description=article.get("description") or article.get("summary"),
            raw_text=(article.get("raw_text") or "")[:12000],
            published_at=article.get("published_at"),
            source=article.get("source", "Unknown"),
            event_key=article.get("event_key"),
            event_name=article.get("title", "Event"),
            topic=article.get("topic", "General"),
            sentiment=article.get("sentiment", "neutral"),
            sentiment_score=article.get("sentiment_score", 0.0),
            confidence_score=article.get("confidence_score", 0.0),
            source_credibility=article.get("source_credibility", 0.65),
        )

    async def _upsert_location(self, article: Dict[str, Any]) -> None:
        location = article.get("location") or {}
        name = location.get("name")
        if not name:
            return

        query = """
        MATCH (ev:Entity:Event {event_key: $event_key})
        MERGE (loc:Entity:Location {name: $name})
        ON CREATE SET loc.created_at = datetime()
        SET loc.lat = $lat,
            loc.lon = $lon,
            loc.updated_at = datetime()
        MERGE (ev)-[r:LOCATED_IN]->(loc)
        ON CREATE SET r.created_at = datetime()
        SET r.timestamp = $published_at,
            r.confidence = $confidence
        """
        await neo4j_client.execute_write(
            query,
            event_key=article.get("event_key"),
            name=name,
            lat=location.get("lat"),
            lon=location.get("lon"),
            confidence=location.get("confidence", 0.5),
            published_at=article.get("published_at"),
        )

    async def _upsert_organizations(self, article: Dict[str, Any]) -> None:
        organizations = [
            entity
            for entity in article.get("entities", [])
            if entity.get("type") == "Organization"
        ]
        if not organizations:
            return

        query = """
        MATCH (ev:Entity:Event {event_key: $event_key})
        UNWIND $organizations AS org
        MERGE (o:Entity:Organization {name: org.name})
        ON CREATE SET o.created_at = datetime()
        SET o.category = coalesce(org.category, o.category),
            o.updated_at = datetime()
        MERGE (ev)-[r:INVOLVES]->(o)
        ON CREATE SET r.created_at = datetime()
        SET r.timestamp = $published_at,
            r.source = $source
        """
        await neo4j_client.execute_write(
            query,
            event_key=article.get("event_key"),
            organizations=organizations,
            source=article.get("source", "Unknown"),
            published_at=article.get("published_at"),
        )

    async def _upsert_people(self, article: Dict[str, Any]) -> None:
        people = [entity for entity in article.get("entities", []) if entity.get("type") == "Person"]
        if not people:
            return

        query = """
        MATCH (ev:Entity:Event {event_key: $event_key})
        UNWIND $people AS person
        MERGE (p:Entity:Person {name: person.name})
        ON CREATE SET p.created_at = datetime()
        SET p.category = coalesce(person.category, p.category),
            p.updated_at = datetime()
        MERGE (p)-[r:MENTIONED_IN]->(ev)
        ON CREATE SET r.created_at = datetime()
        SET r.timestamp = $published_at,
            r.source = $source
        """
        await neo4j_client.execute_write(
            query,
            event_key=article.get("event_key"),
            people=people,
            source=article.get("source", "Unknown"),
            published_at=article.get("published_at"),
        )

    async def _upsert_related_events(self, article: Dict[str, Any]) -> None:
        related_events = [entity for entity in article.get("entities", []) if entity.get("type") == "Event"]
        if not related_events:
            return

        query = """
        MATCH (ev:Entity:Event {event_key: $event_key})
        UNWIND $related_events AS event_entity
        MERGE (re:Entity:Event {name: event_entity.name})
        ON CREATE SET re.created_at = datetime()
        SET re.updated_at = datetime()
        MERGE (ev)-[r:RELATED_TO]->(re)
        ON CREATE SET r.created_at = datetime()
        SET r.source = $source,
            r.timestamp = $published_at
        """
        await neo4j_client.execute_write(
            query,
            event_key=article.get("event_key"),
            related_events=related_events,
            source=article.get("source", "Unknown"),
            published_at=article.get("published_at"),
        )


graph_updater = GraphUpdater()
