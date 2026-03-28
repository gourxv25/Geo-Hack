from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.database.postgres_client import postgres_client


class NewsRepository:
    def __init__(self, table_name: str = "articles") -> None:
        self.table_name = table_name

    async def list_news(
        self,
        *,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        category: Optional[str],
        region: Optional[str],
        page: int,
        limit: int,
        cursor: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], int, Optional[str]]:
        where_clauses: List[str] = []
        params: Dict[str, Any] = {}

        if start_date is not None:
            where_clauses.append("published_at >= :start_date")
            params["start_date"] = start_date
        if end_date is not None:
            where_clauses.append("published_at <= :end_date")
            params["end_date"] = end_date
        if category:
            where_clauses.append(
                """
                EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(COALESCE(categories, '[]'::jsonb)) AS cat
                    WHERE lower(cat) = lower(:category)
                )
                """
            )
            params["category"] = category
        if region:
            where_clauses.append("lower(COALESCE(region, '')) = lower(:region)")
            params["region"] = region

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        effective_limit = max(1, min(limit, 100))
        if cursor is not None and cursor.strip().isdigit():
            offset = max(0, int(cursor.strip()))
        else:
            safe_page = max(1, page)
            offset = (safe_page - 1) * effective_limit

        params["limit"] = effective_limit
        params["offset"] = offset

        rows = await postgres_client.execute_query(
            f"""
            SELECT id, title, summary, content, source, url, published_at, categories, entities,
                   domain, region, sentiment, relevance_score, source_credibility, event_key
            FROM {self.table_name}
            {where_sql}
            ORDER BY published_at DESC, id DESC
            LIMIT :limit OFFSET :offset
            """,
            params,
        )

        total_rows = await postgres_client.execute_query(
            f"""
            SELECT COUNT(*) AS total
            FROM {self.table_name}
            {where_sql}
            """,
            {k: v for k, v in params.items() if k not in {"limit", "offset"}},
        )
        total = int(total_rows[0]["total"]) if total_rows else 0

        next_cursor: Optional[str] = None
        if (offset + effective_limit) < total:
            next_cursor = str(offset + effective_limit)

        return rows, total, next_cursor

    async def get_news_by_id(self, news_id: str) -> Optional[Dict[str, Any]]:
        rows = await postgres_client.execute_query(
            f"""
            SELECT id, title, summary, content, source, url, published_at, categories, entities,
                   domain, region, sentiment, relevance_score, source_credibility, event_key
            FROM {self.table_name}
            WHERE id = :id
            LIMIT 1
            """,
            {"id": news_id},
        )
        return rows[0] if rows else None


news_repository = NewsRepository()
