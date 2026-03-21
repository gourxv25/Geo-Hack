"""
News Ingestion Service - RSS and API Integration
"""
import feedparser
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dateutil import parser as date_parser
from loguru import logger

from app.config import settings
from app.database.neo4j_client import neo4j_client


class NewsIngestor:
    """Service for ingesting news from multiple sources"""
    
    def __init__(self):
        self.rss_feeds = settings.rss_feeds
        self.newsapi_key = settings.news_api_key
    
    async def ingest_from_rss(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Ingest news from RSS feeds"""
        articles = []
        
        for feed_url in self.rss_feeds:
            try:
                logger.info(f"RSS fetch started: {feed_url}")
                response = requests.get(
                    feed_url,
                    timeout=30,
                    headers={"User-Agent": "global-ontology-engine/1.0"},
                )
                logger.info(f"RSS HTTP status {response.status_code} for {feed_url}")
                response.raise_for_status()

                feed = feedparser.parse(response.content)
                source_name = feed.feed.get('title', 'Unknown')
                logger.info(
                    f"RSS parsed {len(feed.entries)} entries from {feed_url} (source={source_name})"
                )

                for entry in feed.entries[:limit]:
                    article = self._parse_rss_entry(entry, source_name)
                    if article:
                        articles.append(article)
                        
            except Exception as e:
                logger.error(f"Error parsing RSS feed {feed_url}: {e}")
        
        logger.info(f"RSS ingestion completed with {len(articles)} articles")
        return articles
    
    def _parse_rss_entry(self, entry: Any, source_name: str) -> Optional[Dict[str, Any]]:
        """Parse RSS entry to article format"""
        try:
            # Parse published date
            published_at = None
            if hasattr(entry, 'published'):
                try:
                    published_at = date_parser.parse(entry.published).isoformat()
                except:
                    published_at = datetime.utcnow().isoformat()
            
            # Extract categories/tags
            categories = []
            if hasattr(entry, 'tags'):
                categories = [tag.term for tag in entry.tags]
            elif hasattr(entry, 'categories'):
                categories = list(entry.categories)
            
            # Get summary (strip HTML)
            summary = ''
            if hasattr(entry, 'summary'):
                summary = self._strip_html(entry.summary)
            elif hasattr(entry, 'description'):
                summary = self._strip_html(entry.description)
            
            # Get title
            title = getattr(entry, 'title', 'Untitled')
            
            return {
                'title': title,
                'summary': summary[:500],  # Limit summary length
                'url': getattr(entry, 'link', ''),
                'source': source_name,
                'published_at': published_at,
                'categories': categories,
                'ingested_at': datetime.utcnow().isoformat(),
                'status': 'pending',  # pending, processed, error
            }
        except Exception as e:
            logger.error(f"Error parsing RSS entry: {e}")
            return None
    
    def _strip_html(self, html: str) -> str:
        """Strip HTML tags from text"""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html)
    
    async def ingest_from_newsapi(
        self, 
        query: str = None,
        language: str = 'en',
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Ingest news from NewsAPI"""
        if not self.newsapi_key:
            logger.warning("NEWS_API_KEY is not configured; skipping NewsAPI ingestion")
            return []
        
        articles = []
        
        try:
            logger.info("NewsAPI fetch started")
            # Top headlines endpoint
            if query is None:
                url = "https://newsapi.org/v2/top-headlines"
                params = {
                    'apiKey': self.newsapi_key,
                    'language': language,
                    'pageSize': limit,
                }
            else:
                url = "https://newsapi.org/v2/everything"
                params = {
                    'apiKey': self.newsapi_key,
                    'q': query,
                    'language': language,
                    'pageSize': limit,
                    'sortBy': 'publishedAt',
                }
            
            response = requests.get(url, params=params, timeout=30)
            logger.info(f"NewsAPI HTTP status {response.status_code} for {url}")
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'ok':
                for article in data.get('articles', []):
                    parsed = self._parse_newsapi_article(article)
                    if parsed:
                        articles.append(parsed)
                logger.info(f"NewsAPI parsed {len(articles)} articles")
            else:
                logger.error(f"NewsAPI response status is not ok: {data.get('status')}")
                        
        except Exception as e:
            logger.error(f"Error fetching from NewsAPI: {e}")
        
        return articles
    
    def _parse_newsapi_article(self, article: Dict) -> Optional[Dict[str, Any]]:
        """Parse NewsAPI article"""
        try:
            published_at = None
            if article.get('publishedAt'):
                try:
                    published_at = date_parser.parse(article['publishedAt']).isoformat()
                except:
                    published_at = datetime.utcnow().isoformat()
            
            source = article.get('source', {}).get('name', 'Unknown')
            
            # Get description
            description = article.get('description') or ''
            if description:
                description = self._strip_html(description)[:500]
            
            # Get content
            content = article.get('content') or ''
            if content:
                content = self._strip_html(content)
            
            return {
                'title': article.get('title', 'Untitled'),
                'summary': description,
                'content': content,
                'url': article.get('url', ''),
                'image_url': article.get('urlToImage'),
                'source': source,
                'author': article.get('author'),
                'published_at': published_at,
                'categories': self._infer_categories(article.get('title', '')),
                'ingested_at': datetime.utcnow().isoformat(),
                'status': 'pending',
            }
        except Exception as e:
            logger.error(f"Error parsing NewsAPI article: {e}")
            return None
    
    def _infer_categories(self, title: str) -> List[str]:
        """Infer categories from article title"""
        title_lower = title.lower()
        categories = []
        
        category_keywords = {
            'Politics': ['election', 'government', 'president', 'parliament', 'minister', 'vote'],
            'Economics': ['economy', 'market', 'trade', 'gdp', 'inflation', 'recession', 'stock'],
            'Technology': ['tech', 'ai', 'software', 'digital', 'cyber', 'startup', 'app'],
            'Defense': ['military', 'army', 'war', 'soldiers', 'defense', 'nato', 'missile'],
            'Climate': ['climate', 'weather', 'disaster', 'flood', 'earthquake', 'temperature'],
            'Health': ['health', 'virus', 'pandemic', 'vaccine', 'disease', 'hospital'],
            'Energy': ['oil', 'gas', 'energy', 'solar', 'wind', 'power', 'electricity'],
        }
        
        for category, keywords in category_keywords.items():
            if any(kw in title_lower for kw in keywords):
                categories.append(category)
        
        return categories if categories else ['General']
    
    async def ingest_all(self, limit_per_source: int = 50) -> Dict[str, Any]:
        """Ingest from all configured sources"""
        all_articles = []
        source_failures: Dict[str, str] = {}
        
        # RSS feeds
        rss_articles: List[Dict[str, Any]] = []
        try:
            rss_articles = await self.ingest_from_rss(limit=limit_per_source)
        except Exception as e:
            source_failures["rss"] = str(e)
            logger.error(f"RSS ingestion failed: {e}")
        all_articles.extend(rss_articles)
        
        # NewsAPI fallback when RSS has no results
        newsapi_articles: List[Dict[str, Any]] = []
        if not rss_articles:
            logger.warning("RSS ingestion produced 0 articles; falling back to NewsAPI")
        if not rss_articles or self.newsapi_key:
            try:
                newsapi_articles = await self.ingest_from_newsapi(limit=limit_per_source)
            except Exception as e:
                source_failures["newsapi"] = str(e)
                logger.error(f"NewsAPI ingestion failed: {e}")
        all_articles.extend(newsapi_articles)
        
        # Final fallback for local debugging environments with blocked network
        if not all_articles:
            logger.warning("Both RSS and NewsAPI returned 0 articles; injecting sample data")
            all_articles = self._mock_articles(limit=min(limit_per_source, 5))

        # Remove duplicates based on URL
        unique_articles = self._deduplicate(all_articles)
        logger.info(
            f"Ingestion collected {len(all_articles)} total articles, "
            f"{len(unique_articles)} unique after deduplication"
        )

        persisted_count = await self.persist_to_neo4j(unique_articles)
        
        return {
            'total_articles': len(all_articles),
            'unique_articles': len(unique_articles),
            'articles': unique_articles[:limit_per_source * 3],  # Limit total
            'sources': list(set(a['source'] for a in unique_articles)),
            'persisted_to_neo4j': persisted_count,
            'source_failures': source_failures,
            'ingested_at': datetime.utcnow().isoformat(),
        }
    
    def _deduplicate(self, articles: List[Dict]) -> List[Dict]:
        """Remove duplicate articles based on URL"""
        seen_urls = set()
        unique = []
        
        for article in articles:
            url = article.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(article)
        
        return unique

    async def persist_to_neo4j(self, articles: List[Dict[str, Any]]) -> int:
        """Persist ingested articles and related nodes into Neo4j."""
        if not articles:
            return 0

        if not neo4j_client.driver:
            try:
                await neo4j_client.connect()
            except Exception as e:
                logger.error(f"Neo4j connection unavailable during ingestion: {e}")
                return 0

        persisted_count = 0
        for article in articles:
            try:
                result = await neo4j_client.create_article_graph(article)
                if result:
                    persisted_count += 1
                    logger.info(f"Stored article in Neo4j: {article.get('title', 'Untitled')}")
            except Exception as e:
                logger.error(
                    f"Failed storing article in Neo4j (url={article.get('url', '')}): {e}"
                )

        logger.info(f"Neo4j persistence completed with {persisted_count}/{len(articles)} articles")
        return persisted_count

    def _mock_articles(self, limit: int = 3) -> List[Dict[str, Any]]:
        """Provide deterministic fallback sample data when network fetch is unavailable."""
        now = datetime.utcnow().isoformat()
        samples = [
            {
                "title": "Sample Geopolitical Briefing",
                "summary": "Synthetic fallback article generated because external feeds were unreachable.",
                "content": "This is a mock record used to validate persistence and downstream processing.",
                "url": "https://example.local/news/sample-1",
                "source": "SampleSource",
                "author": "system",
                "published_at": now,
                "categories": ["General"],
                "ingested_at": now,
                "status": "pending",
            },
            {
                "title": "Sample Technology Watch",
                "summary": "Synthetic technology article used for pipeline resilience testing.",
                "content": "Fallback content for local development where outbound access is restricted.",
                "url": "https://example.local/news/sample-2",
                "source": "SampleSource",
                "author": "system",
                "published_at": now,
                "categories": ["Technology"],
                "ingested_at": now,
                "status": "pending",
            },
            {
                "title": "Sample Economic Update",
                "summary": "Synthetic economics article to keep analytics flows active in offline mode.",
                "content": "Mocked dataset entry for integration testing.",
                "url": "https://example.local/news/sample-3",
                "source": "SampleSource",
                "author": "system",
                "published_at": now,
                "categories": ["Economics"],
                "ingested_at": now,
                "status": "pending",
            },
        ]
        return samples[: max(1, limit)]


# Singleton instance
news_ingestor = NewsIngestor()
