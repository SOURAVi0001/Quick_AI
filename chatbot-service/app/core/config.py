"""Configuration settings for the Quick.AI Chatbot Backend Service.

Loads settings from environment variables or a .env file with safe defaults.
"""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "app" / "data"


class Settings(BaseSettings):
    """Application configuration and tunable thresholds."""

    # Server settings
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SUPPORTED_APPLICATION_ID: str = "quickai"

    # LLM Provider settings
    # Options: "mock" (default, zero external dependency) or "lm_studio"
    LLM_PROVIDER: str = "mock"
    LLM_BASE_URL: str = "http://localhost:1234/v1"
    LLM_API_KEY: str = "lm-studio"
    LLM_MODEL: str = "local-model"
    LLM_REQUEST_TIMEOUT_SECONDS: float = 30.0

    # Pipeline retry & retrieval bounds
    MAX_RETRIES: int = 2
    RETRIEVAL_TOP_K: int = 5
    RETRIEVAL_MIN_SIMILARITY_THRESHOLD: float = 0.25

    # Evaluation acceptance thresholds (LLM-as-a-judge)
    EVALUATION_RELEVANCE_THRESHOLD: float = 0.75
    EVALUATION_GROUNDING_THRESHOLD: float = 0.75

    # Logging
    LOG_LEVEL: str = "INFO"

    # Database & Backend settings
    DATABASE_URL: Optional[str] = "postgresql://neondb_owner:npg_A3P0ceWxQtIn@ep-silent-union-a4a58299-pooler.us-east-1.aws.neon.tech/neondb"
    BACKEND_API_URL: str = "http://localhost:3000"

    # Embedding & Vector Database settings
    # Options: "openrouter", "sentence_transformers", or "mock"
    EMBEDDING_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: Optional[str] = None
    EMBEDDING_MODEL: str = "nvidia/nemotron-3-embed-1b:free"
    FAISS_INDEX_PATH: Path = DATA_DIR / "faiss_index.bin"
    FAISS_METADATA_PATH: Path = DATA_DIR / "faiss_metadata.json"
    DOCUMENTATION_PATH: Path = BASE_DIR / "docs" / "quickai_documentation.md"

    # Data file paths
    KNOWLEDGE_BASE_PATH: Path = DATA_DIR / "knowledge_base.json"
    USER_CONTEXT_PATH: Path = DATA_DIR / "user_context.json"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global settings singleton
settings = Settings()
