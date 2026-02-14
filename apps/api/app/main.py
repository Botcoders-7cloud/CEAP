"""
CEAP FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.v1 import router as api_router
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # Startup — create tables if they don't exist
    print(f"🚀 CEAP API starting in {settings.APP_ENV} mode")
    print(f"📦 Database: {'SQLite' if settings.is_sqlite else 'PostgreSQL'}")
    await init_db()
    print("✅ Database tables ready")
    yield
    # Shutdown
    print("👋 CEAP API shutting down")


app = FastAPI(
    title="CEAP API",
    description="Campus Event & Assessment Platform — REST API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
        "env": settings.APP_ENV,
        "docs": "/api/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
