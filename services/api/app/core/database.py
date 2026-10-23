import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

# Determine connect args based on DB engine
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development" and False),
    future=True,
    connect_args=connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Configurable session factory (allows test override)
session_factory = AsyncSessionLocal

def get_session():
    return session_factory()

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with get_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Create tables if they don't exist yet (for fast development/tests)."""
    async with engine.begin() as conn:
        # If postgres, enable extension if possible
        if "postgresql" in settings.DATABASE_URL:
            try:
                from sqlalchemy import text
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            except Exception as e:
                logger.warning(f"Could not auto-enable extensions (may require superuser): {e}")
        await conn.run_sync(Base.metadata.create_all)
