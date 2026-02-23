"""
CEAP FastAPI Application Entry Point
Includes rate limiting, security headers, error handling, and CORS.
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.v1 import router as api_router
from app.database import init_db
from app.core.limiter import limiter
from app.core.error_handler import ErrorHandlerMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    import asyncio
    from app.services.scheduler import run_scheduler

    print(f"🚀 CEAP API starting in {settings.APP_ENV} mode")
    print(f"📦 Database: {'SQLite' if settings.is_sqlite else 'PostgreSQL'}")
    await init_db()
    print("✅ Database tables ready")

    # Start event scheduler as background task
    scheduler_task = asyncio.create_task(run_scheduler())

    yield

    # Cancel scheduler on shutdown
    scheduler_task.cancel()
    print("👋 CEAP API shutting down")


app = FastAPI(
    title="CEAP API",
    description="Campus Event & Assessment Platform — REST API",
    version="0.3.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Error Handler (must be first middleware) ──
app.add_middleware(ErrorHandlerMiddleware)

# ── Rate Limiter Setup ────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Security Headers Middleware ───────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.APP_ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# ── Routes ────────────────────────────────────
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "0.3.0",
        "status": "running",
        "env": settings.APP_ENV,
        "docs": "/api/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}

