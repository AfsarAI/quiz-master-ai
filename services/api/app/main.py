import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("quizmaster.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Quiz-Master-AI Database schema...")
    try:
        await init_db()
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")

    # Auto-seed standard demo accounts in development if not already present
    if settings.ENVIRONMENT == "development":
        try:
            from app.core.seeder import seed_demo_users
            from app.core.database import session_factory
            async with session_factory() as session:
                seed_res = await seed_demo_users(session, reset_passwords=False)
                logger.info(
                    f"Demo accounts check: {seed_res['created']} created, "
                    f"{seed_res['preserved']} verified/preserved."
                )
        except Exception as e:
            logger.warning(f"Demo accounts auto-seed notice: {e}")

    yield
    logger.info("Shutting down Quiz-Master-AI application...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade AI-first educational assessment and personalized learning platform with RAG.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
origins = settings.BACKEND_CORS_ORIGINS or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level redirects to versioned Swagger documentation & schema
@app.api_route("/docs", methods=["GET", "HEAD"], include_in_schema=False)
async def docs_redirect():
    """Redirect root /docs to versioned /api/v1/docs for seamless navigation."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")

@app.api_route("/openapi.json", methods=["GET", "HEAD"], include_in_schema=False)
async def openapi_redirect():
    """Redirect root /openapi.json to versioned /api/v1/openapi.json."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/openapi.json")

@app.api_route("/redoc", methods=["GET", "HEAD"], include_in_schema=False)
async def redoc_redirect():
    """Redirect root /redoc to versioned /api/v1/redoc."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/redoc")

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }
