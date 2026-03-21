"""
Insights API Endpoints - Real-time Analytics and Risk Analysis
"""
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.insights import insights_service

router = APIRouter()


class RiskCategory(BaseModel):
    """Risk category model"""

    name: str
    score: float
    trend: str  # increasing, decreasing, stable
    description: str


class CountryImpact(BaseModel):
    """Country impact model"""

    name: str
    code: str  # ISO country code
    impact_score: float
    impact_type: str  # high, medium, low
    affected_sectors: List[str]
    recent_events: int


class TrendData(BaseModel):
    """Trend data point"""

    date: str
    value: float
    label: Optional[str] = None


class InsightResponse(BaseModel):
    """Insight response model"""

    generated_at: str
    summary: str
    key_findings: List[str]
    risk_analysis: Dict[str, Any]
    country_impacts: List[CountryImpact]
    trending_entities: List[Dict[str, Any]]
    emerging_events: List[Dict[str, Any]]


@router.get("", response_model=InsightResponse)
async def get_insights(
    domain: Optional[str] = None,
    region: Optional[str] = None,
    timeframe: Optional[str] = "7d"
):
    """
    Get real-time strategic insights
    """
    try:
        risk_analysis = await insights_service.get_risk_analysis(
            category=domain,
            region=region
        )
        map_data = await insights_service.get_map_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {e}") from e

    countries = map_data.get("countries", [])
    country_impacts = [
        CountryImpact(
            name=item.get("country", "Unknown"),
            code=item.get("code", "UNK"),
            impact_score=float(item.get("impact", 0.0)),
            impact_type=item.get("risk", "low"),
            affected_sectors=item.get("categories", []),
            recent_events=int(item.get("recent_events", 0)),
        )
        for item in countries[:20]
    ]

    categories = risk_analysis.get("categories", [])
    key_findings = [
        f"{entry.get('category', 'Unknown')} risk at {entry.get('level', 0)}%"
        for entry in categories[:5]
    ]

    trending_entities = [
        {
            "name": item.get("country", "Unknown"),
            "type": "Country",
            "mentions": int(item.get("recent_events", 0)),
            "trend": "up" if item.get("impact", 0) >= 60 else "stable",
        }
        for item in countries[:10]
    ]

    emerging_events = [
        {
            "title": f"{entry.get('category', 'Unknown')} pressure shift",
            "severity": "high" if entry.get("level", 0) >= 70 else "medium",
            "date": datetime.utcnow().date().isoformat(),
        }
        for entry in categories[:5]
    ]

    return InsightResponse(
        generated_at=datetime.utcnow().isoformat(),
        summary=f"Generated strategic snapshot for {timeframe} with {len(categories)} active risk categories.",
        key_findings=key_findings,
        risk_analysis=risk_analysis,
        country_impacts=country_impacts,
        trending_entities=trending_entities,
        emerging_events=emerging_events,
    )


@router.get("/risk-analysis")
async def get_risk_analysis(
    category: Optional[str] = None,
    detailed: bool = False
):
    """
    Get detailed risk analysis
    """
    try:
        result = await insights_service.get_risk_analysis(category=category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {e}") from e

    return {
        "overall_risk_score": result.get("overall_risk", {}).get("score", 0),
        "risk_level": result.get("overall_risk", {}).get("level", "low"),
        "categories": {
            item.get("category", "").lower(): {
                "score": item.get("level", 0) / 100,
                "trend": (
                    "increasing" if item.get("trend") == "up"
                    else "decreasing" if item.get("trend") == "down"
                    else "stable"
                ),
            }
            for item in result.get("categories", [])
        },
        "historical_trend": result.get("trends", {}).get("weekly", []),
        "full": result if detailed else None,
    }


@router.get("/map-data")
async def get_map_data(
    metric: str = "impact",  # impact, risk, events
    timeframe: str = "7d"
):
    """
    Get data for world map visualization
    """
    try:
        data = await insights_service.get_map_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Map data generation failed: {e}") from e

    return {
        "metric": metric,
        "timeframe": timeframe,
        "countries": [
            {
                "code": item.get("code", "UNK"),
                "name": item.get("country", "Unknown"),
                "value": item.get("impact", 0),
                "events": item.get("recent_events", 0),
                "lat": item.get("lat", 0.0),
                "lng": item.get("lng", 0.0),
            }
            for item in data.get("countries", [])
        ],
        "legend": {
            "high": {"min": 0.7, "color": "#ff4444"},
            "medium": {"min": 0.4, "color": "#ffaa00"},
            "low": {"min": 0, "color": "#44aa44"},
        },
    }


@router.get("/trends")
async def get_trends(
    entity_type: Optional[str] = None,
    limit: int = 10
):
    """
    Get trending entities and topics
    """
    data = await insights_service.get_risk_analysis(category=entity_type)
    categories = data.get("categories", [])
    return {
        "trending_entities": [
            {
                "name": item.get("category", "Unknown"),
                "type": "RiskCategory",
                "mentions": int(item.get("level", 0)),
                "change": int(item.get("level", 0)) - 50,
            }
            for item in categories[:limit]
        ],
        "emerging_topics": [
            {
                "topic": item.get("category", "Unknown"),
                "growth": int(item.get("level", 0)),
                "sentiment": "negative" if item.get("level", 0) > 60 else "neutral",
            }
            for item in categories[:limit]
        ],
    }
