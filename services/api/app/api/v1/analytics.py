from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse, AdaptiveQuizRequest
from app.schemas.quiz import QuizGenerateResponse
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Diagnostic Analytics & Weak-Area Remediation"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns user's diagnostic mastery heatmap, identified weak concepts, and study time."""
    return await analytics_service.get_user_analytics(current_user.id, db)

@router.post("/adaptive-quiz", response_model=QuizGenerateResponse, status_code=status.HTTP_201_CREATED)
async def generate_adaptive_remediation_quiz(
    req: AdaptiveQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click generation of targeted adaptive practice test dynamically focusing
    on the user's detected weak areas.
    """
    try:
        quiz = await analytics_service.create_adaptive_remediation_quiz(
            user_id=current_user.id,
            req=req,
            db=db,
        )
        return QuizGenerateResponse(
            quiz_id=quiz.id,
            status="READY",
            message=f"Adaptive remediation quiz generated for your weak concepts.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
