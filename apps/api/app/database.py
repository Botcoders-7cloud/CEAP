"""
CEAP Database Configuration
Async SQLAlchemy engine and session management.
Supports both PostgreSQL (production) and SQLite (local dev).
"""
import ssl
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Build the actual database URL
db_url = settings.DATABASE_URL

# Convert standard postgresql:// to async driver
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# SQLite needs special connect_args
connect_args = {}
engine_kwargs = {
    "echo": settings.APP_ENV == "development",
    "pool_pre_ping": True,
}

if settings.is_sqlite:
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL production settings
    # Create SSL context for Supabase (requires SSL)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    engine_kwargs["connect_args"] = {"ssl": ssl_context}
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 1800  # Recycle connections after 30 min

engine = create_async_engine(db_url, **engine_kwargs)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db():
    """Dependency: yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and add missing columns. Gracefully handles failures."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created/verified")

        # Add missing columns to existing tables (create_all can't ALTER)
        await _apply_column_migrations()

    except Exception as e:
        print(f"⚠️  Database init warning: {e}")
        print("   Tables may need to be created manually or the DB may be temporarily unavailable.")


async def _apply_column_migrations():
    """
    Safely add missing columns to existing tables.
    Each ALTER is idempotent — if column exists, the error is caught silently.
    """
    migrations = [
        # Phase 1: password reset fields
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP",
        # Phase 2: must change password
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false",
    ]

    # SQLite uses a different syntax and doesn't support IF NOT EXISTS
    if settings.is_sqlite:
        print("ℹ️  SQLite: skipping ALTER TABLE migrations (handled by create_all)")
        return

    try:
        async with engine.begin() as conn:
            for sql in migrations:
                try:
                    await conn.execute(sa.text(sql))
                except Exception:
                    pass  # Column likely already exists
        print("✅ Column migrations applied")
    except Exception as e:
        print(f"⚠️  Column migration warning: {e}")

