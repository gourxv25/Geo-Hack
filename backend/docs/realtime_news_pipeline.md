cl# Real-Time Global News Pipeline

## 1) Textual Architecture Diagram

```text
        +------------------------+
        |      Celery Beat       |
        |   (2-5 min polling)    |
        +-----------+------------+
                    |
                    v
        +------------------------+      +------------------------+
        |  Fetch Layer (async)   |<-----|  RSS + NewsAPI + GDELT |
        | aiohttp + retry/timeout|      |  + optional EventReg.  |
        +-----------+------------+      +------------------------+
                    |
                    v
        +------------------------+
        |   Normalize Layer      |
        | title/description/url  |
        | published_at/raw_text  |
        +-----------+------------+
                    |
                    v
        +------------------------+      +------------------------+
        | Dedup Layer            |<---->| Redis seen-url cache   |
        | URL hash + title sim   |      | TTL avoids reprocessing|
        +-----------+------------+      +------------------------+
                    |
                    v
        +------------------------+
        |  Enrichment Layer      |
        | entities, sentiment,   |
        | topic, geo, confidence |
        +-----------+------------+
                    |
                    v
        +------------------------+      +------------------------+
        | Graph Update Layer     |----->| Neo4j Event ontology   |
        | merge nodes/rels       |      | Event/Org/Loc/Person   |
        +-----------+------------+      +------------------------+
                    |
                    v
        +------------------------+
        | API + Insights Layer   |
        | /news/articles /stats  |
        +------------------------+
```

## 2) Implemented Folder Structure

```text
backend/app/ingestion/
  news_ingestor.py       # orchestration pipeline (fetch->normalize->dedup->enrich->store)
  deduplicator.py        # URL hash + title similarity + Redis duplicate cache
  entity_extractor.py    # NLP enrichment + sentiment + topic + geo + confidence
  graph_updater.py       # Neo4j upsert logic for Event-centric ontology updates
```

## 3) Key Cypher Patterns

```cypher
MERGE (ev:Entity:Event {event_key: $event_key})
SET ev.title = $title, ev.timestamp = $published_at, ev.sentiment = $sentiment
```

```cypher
MERGE (o:Entity:Organization {name: $name})
MERGE (ev)-[:INVOLVES]->(o)
```

```cypher
MERGE (loc:Entity:Location {name: $location_name})
MERGE (ev)-[:LOCATED_IN]->(loc)
```

```cypher
MERGE (p:Entity:Person {name: $person_name})
MERGE (p)-[:MENTIONED_IN]->(ev)
```

## 4) Production Scaling Notes

- Scale ingestion workers horizontally with Celery worker pools.
- Keep `NEWS_USE_LLM_ENRICHMENT=false` for high-throughput mode, enable selectively for premium pipelines.
- Tune:
  - `NEWS_MAX_CONCURRENT_FETCHES`
  - `NEWS_MAX_CONCURRENT_ENRICHMENT`
  - `NEWS_BATCH_SIZE`
- Keep Redis duplicate TTL to 6h+ to suppress repeated wire stories.
- Use Neo4j constraints/indexes (`event_key`, `article.url`, `source.name`) to maintain merge performance.
- Add Kafka between fetch and enrich when throughput exceeds single worker capacity.
