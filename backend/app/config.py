"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Global Ontology Engine"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Neo4j Graph Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "ontology123"
    NEO4J_DATABASE: str = "neo4j"
    
    # PostgreSQL Database
    DATABASE_URL: str = "postgresql://ontology_user:ontology123@localhost:5432/ontology_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_MODEL_GPT4: str = "gpt-4-turbo-preview"
    OPENAI_MODEL_GPT35: str = "gpt-3.5-turbo"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # News APIs
    NEWS_API_KEY: Optional[str] = None
    
    # RSS Feed Sources
    RSS_FEEDS: list = [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://feeds.npr.org/1004/rss.xml",
        "https://www.theguardian.com/world/rss",
        "https://www.dw.com/en/top-stories/rss",
        "https://www.france24.com/en/rss"
    ]
    
    # Data Ingestion Settings
    INGESTION_INTERVAL_MINUTES: int = 30
    MAX_ARTICLES_PER_INGESTION: int = 100
    STARTUP_INGESTION_ENABLED: bool = True
    STARTUP_INGESTION_LIMIT: int = 5
    
    # GraphRAG Settings
    GRAPHRAG_TOP_K: int = 5
    GRAPHRAG_MAX_HOPS: int = 3
    MAX_CONTEXT_ENTITIES: int = 50
    MAX_CONTEXT_RELATIONS: int = 100
    MAX_HOPS: int = 3
    
    # API Settings
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        """Allow loose DEBUG values from env files."""
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        value_str = str(value).strip().lower()
        if value_str in {"1", "true", "yes", "on", "debug", "development"}:
            return True
        if value_str in {"0", "false", "no", "off", "release", "prod", "production"}:
            return False
        return True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, list):
            return value
        if value is None:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        value_str = str(value).strip()
        if "," in value_str:
            return [origin.strip() for origin in value_str.split(",") if origin.strip()]
        return [value_str] if value_str else ["http://localhost:3000", "http://127.0.0.1:3000"]

    @property
    def openai_api_key(self) -> str:
        return self.OPENAI_API_KEY

    @property
    def openai_model(self) -> str:
        return self.OPENAI_MODEL or self.OPENAI_MODEL_GPT4

    @property
    def openai_embedding_model(self) -> str:
        return self.OPENAI_EMBEDDING_MODEL

    @property
    def openai_max_tokens(self) -> int:
        return self.OPENAI_MAX_TOKENS

    @property
    def rss_feeds(self) -> List[str]:
        return self.RSS_FEEDS

    @property
    def news_api_key(self) -> Optional[str]:
        return self.NEWS_API_KEY

    @property
    def graphrag_top_k(self) -> int:
        return self.GRAPHRAG_TOP_K

    @property
    def graphrag_max_hops(self) -> int:
        return self.GRAPHRAG_MAX_HOPS

    @property
    def startup_ingestion_enabled(self) -> bool:
        return self.STARTUP_INGESTION_ENABLED

    @property
    def startup_ingestion_limit(self) -> int:
        return self.STARTUP_INGESTION_LIMIT
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Export settings instance
settings = get_settings()
