from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.attempts import router as attempts_router
from app.api.v1.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(documents_router)
api_router.include_router(quizzes_router)
api_router.include_router(attempts_router)
api_router.include_router(analytics_router)

@api_router.get("/health", tags=["Health"])
async def api_v1_health():
    return {"status": "healthy", "api_version": "v1"}
