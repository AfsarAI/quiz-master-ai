from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Quiz-Master-AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecret-jwt-key-for-quiz-master-ai-production-grade"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5435
    POSTGRES_USER: str = "quizmaster"
    POSTGRES_PASSWORD: str = "quizmaster_secret"
    POSTGRES_DB: str = "quizmaster_ai"
    DATABASE_URL: str = "postgresql+asyncpg://quizmaster:quizmaster_secret@localhost:5435/quizmaster_ai"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6382
    REDIS_URL: str = "redis://localhost:6382/0"

    # Object Storage
    S3_ENDPOINT: str = "http://localhost:9002"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "quizmaster-documents"
    S3_REGION: str = "us-east-1"
    LOCAL_STORAGE_PATH: str = "./storage_uploads"

    # AI & LLM Providers
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_LLM_MODEL: str = "gemini/gemini-3.8-flash"
    DEFAULT_EMBEDDING_MODEL: str = "gemini/gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 1536

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8081",
        "http://localhost:19006",
        "*"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
