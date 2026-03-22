"""
Article enrichment for:
- entity extraction
- sentiment
- topic classification
- geo tagging
- confidence scoring
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger

from app.nlp.nlp_service import nlp_service


class NewsEntityExtractor:
    """Enrich normalized news payloads with NLP and analytic features."""

    _SOURCE_CREDIBILITY: Dict[str, float] = {
        "bbc": 0.92,
        "reuters": 0.95,
        "al jazeera": 0.85,
        "cnn": 0.80,
        "npr": 0.90,
        "the guardian": 0.88,
        "dw": 0.86,
        "france24": 0.84,
        "newsapi": 0.70,
        "gdelt": 0.72,
        "eventregistry": 0.75,
    }

    _TOPIC_KEYWORDS: Dict[str, Tuple[str, ...]] = {
        "Geopolitical": (
            "election",
            "parliament",
            "diplomatic",
            "treaty",
            "government",
            "embassy",
            "border",
        ),
        "Economic": (
            "market",
            "inflation",
            "interest rate",
            "gdp",
            "recession",
            "trade",
            "tariff",
            "economy",
        ),
        "Defense": (
            "military",
            "troops",
            "missile",
            "airstrike",
            "navy",
            "defense",
            "conflict",
            "war",
        ),
        "Technology": (
            "ai",
            "semiconductor",
            "cyber",
            "software",
            "cloud",
            "startup",
            "digital",
        ),
        "Climate": (
            "climate",
            "temperature",
            "emission",
            "flood",
            "wildfire",
            "storm",
            "carbon",
        ),
        "Energy": (
            "oil",
            "gas",
            "renewable",
            "solar",
            "wind",
            "pipeline",
            "electricity",
        ),
        "Health": (
            "health",
            "hospital",
            "pandemic",
            "vaccine",
            "disease",
            "outbreak",
            "medical",
        ),
    }

    # Lightweight seed mapping for map visualization.
    _GEO_COORDS: Dict[str, Tuple[float, float]] = {
        "london": (51.5072, -0.1276),
        "washington": (38.9072, -77.0369),
        "new york": (40.7128, -74.0060),
        "beijing": (39.9042, 116.4074),
        "tokyo": (35.6762, 139.6503),
        "new delhi": (28.6139, 77.2090),
        "moscow": (55.7558, 37.6173),
        "brussels": (50.8503, 4.3517),
        "jerusalem": (31.7683, 35.2137),
        "kyiv": (50.4501, 30.5234),
    }

    def __init__(
        self,
        max_raw_text_chars: int = 9000,
        max_llm_text_chars: int = 2800,
        use_llm_enrichment: bool = False,
    ):
        self.max_raw_text_chars = max_raw_text_chars
        self.max_llm_text_chars = max_llm_text_chars
        self.use_llm_enrichment = use_llm_enrichment

    async def enrich_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        text = self._build_processing_text(article)
        entities = await self._extract_entities(text)
        topic = self._classify_topic(text, article.get("categories", []))
        sentiment = await self._analyze_sentiment(text)
        geo = self._geo_tag(article=article, entities=entities, text=text)
        credibility = self._source_credibility(article.get("source", ""))
        confidence = self._confidence_score(
            credibility=credibility,
            entities=entities,
            text=text,
            sentiment=sentiment,
        )
        event_key = self._event_cluster_key(article=article, geo=geo, topic=topic)

        article["raw_text"] = text[: self.max_raw_text_chars]
        article["entities"] = entities
        article["topic"] = topic
        article["sentiment"] = sentiment.get("sentiment", "neutral")
        article["sentiment_score"] = sentiment.get("score", 0.0)
        article["sentiment_confidence"] = sentiment.get("confidence", 0.0)
        article["location"] = geo
        article["source_credibility"] = credibility
        article["confidence_score"] = confidence
        article["event_key"] = event_key
        article["enriched_at"] = datetime.utcnow().isoformat()
        return article

    def _build_processing_text(self, article: Dict[str, Any]) -> str:
        blocks = [
            article.get("title", ""),
            article.get("description", ""),
            article.get("summary", ""),
            article.get("raw_text", ""),
            article.get("content", ""),
        ]
        compact = "\n".join(block for block in blocks if block)
        compact = re.sub(r"\s+", " ", compact).strip()
        return compact[: self.max_raw_text_chars]

    async def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        if not text:
            return []

        entities: List[Dict[str, Any]] = []
        try:
            if hasattr(nlp_service, "_extract_entities_spacy"):
                entities.extend(nlp_service._extract_entities_spacy(text[:5000]))  # pylint: disable=protected-access
        except Exception as exc:
            logger.warning(f"spaCy entity extraction failed: {exc}")

        if self.use_llm_enrichment:
            try:
                llm_entities = await nlp_service.extract_entities(text[: self.max_llm_text_chars])
                entities.extend(llm_entities)
            except Exception as exc:
                logger.warning(f"LLM entity enrichment failed: {exc}")

        return self._normalize_entities(entities)

    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"sentiment": "neutral", "score": 0.0, "confidence": 0.0}

        if self.use_llm_enrichment:
            try:
                return await nlp_service.analyze_sentiment(text[: self.max_llm_text_chars])
            except Exception as exc:
                logger.warning(f"LLM sentiment failed; using lexical fallback: {exc}")

        # Fast lexical fallback for high-throughput operation.
        positive_terms = ("growth", "peace", "agreement", "success", "stable", "recovery")
        negative_terms = ("war", "crisis", "attack", "collapse", "sanction", "conflict")
        text_lower = text.lower()
        pos = sum(1 for term in positive_terms if term in text_lower)
        neg = sum(1 for term in negative_terms if term in text_lower)
        score = 0.0
        if pos or neg:
            score = (pos - neg) / float(pos + neg)
        sentiment = "neutral"
        if score > 0.15:
            sentiment = "positive"
        elif score < -0.15:
            sentiment = "negative"
        confidence = min(1.0, (pos + neg) / 5.0)
        return {"sentiment": sentiment, "score": score, "confidence": confidence}

    def _normalize_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        seen = set()
        for entity in entities:
            name = str(entity.get("name", "")).strip()
            if not name:
                continue
            entity_type = self._map_entity_type(str(entity.get("type", "")))
            key = f"{name.lower()}::{entity_type.lower()}"
            if key in seen:
                continue
            seen.add(key)
            normalized.append(
                {
                    "name": name[:180],
                    "type": entity_type,
                    "category": entity.get("category") or "General",
                }
            )
        return normalized

    def _map_entity_type(self, raw_type: str) -> str:
        text = (raw_type or "").lower()
        if text in {"person", "individual", "leader"}:
            return "Person"
        if text in {"organization", "company", "agency"}:
            return "Organization"
        if text in {"country", "location", "city", "gpe", "loc"}:
            return "Location"
        if text == "event":
            return "Event"
        return "Organization"

    def _classify_topic(self, text: str, categories: List[str]) -> str:
        if categories:
            top = str(categories[0]).strip()
            if top:
                return top

        text_lower = text.lower()
        best_topic = "General"
        best_score = 0
        for topic, keywords in self._TOPIC_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best_topic = topic
                best_score = score
        return best_topic

    def _source_credibility(self, source: str) -> float:
        source_lower = (source or "").lower()
        for key, score in self._SOURCE_CREDIBILITY.items():
            if key in source_lower:
                return score
        return 0.65

    def _geo_tag(
        self,
        article: Dict[str, Any],
        entities: List[Dict[str, Any]],
        text: str,
    ) -> Dict[str, Any]:
        # Prefer explicit location entities.
        for entity in entities:
            if entity.get("type") == "Location":
                coords = self._coords_for_name(entity["name"])
                return {
                    "name": entity["name"],
                    "lat": coords[0] if coords else None,
                    "lon": coords[1] if coords else None,
                    "confidence": 0.9 if coords else 0.75,
                }

        # Fallback: title/summary scanning for known capitals.
        text_lower = text.lower()
        for name in self._GEO_COORDS:
            if name in text_lower:
                lat, lon = self._GEO_COORDS[name]
                return {"name": name.title(), "lat": lat, "lon": lon, "confidence": 0.6}

        return {"name": article.get("region", "Global"), "lat": None, "lon": None, "confidence": 0.3}

    def _coords_for_name(self, name: str) -> Optional[Tuple[float, float]]:
        return self._GEO_COORDS.get(name.lower())

    def _event_cluster_key(self, article: Dict[str, Any], geo: Dict[str, Any], topic: str) -> str:
        title = re.sub(r"[^a-z0-9\s]+", " ", (article.get("title", "") or "").lower())
        title = " ".join(title.split())[:160]
        location = (geo.get("name") or "global").lower()
        published = article.get("published_at") or datetime.utcnow().isoformat()
        day_bucket = published[:10]
        base = f"{topic.lower()}::{location}::{day_bucket}::{title}"
        return hashlib.sha1(base.encode("utf-8")).hexdigest()[:24]

    def _confidence_score(
        self,
        credibility: float,
        entities: List[Dict[str, Any]],
        text: str,
        sentiment: Dict[str, Any],
    ) -> float:
        entity_component = min(1.0, len(entities) / 12.0)
        text_component = min(1.0, len(text) / 1800.0)
        sentiment_component = float(sentiment.get("confidence", 0.0))
        score = (
            (credibility * 0.5)
            + (entity_component * 0.2)
            + (text_component * 0.15)
            + (sentiment_component * 0.15)
        )
        return round(max(0.0, min(1.0, score)), 4)

