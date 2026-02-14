"""
CEAP Backend Configuration
Loads environment variables with validation.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_NAME: str = "CEAP"
    API_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Database — defaults to local SQLite for easy testing
    DATABASE_URL: str = "sqlite+aiosqlite:///./ceap_local.db"

    # Supabase (optional, for production)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379"

    # Judge0
    JUDGE0_URL: str = "http://localhost:2358"
    JUDGE0_API_KEY: str = ""

    # JWT
    JWT_SECRET: str = "ceap-local-dev-secret-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60

    # Storage (Cloudflare R2)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""
    R2_BUCKET_NAME: str = "ceap-uploads"
    R2_PUBLIC_URL: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
