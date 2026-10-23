from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.attempt import QuizAttempt
from app.schemas.attempt import (
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitAttemptRequest,
    EvaluatedAttemptResponse,
)
from app.schemas.analytics import RecentAttemptItem
from app.services.evaluation_service import evaluation_service

router = APIRouter(prefix="/attempts", tags=["Assessment & Examination"])

@router.post("/start", response_model=StartAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_quiz_attempt(
    req: StartAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initializes or resumes a secure, timed exam attempt session."""
    try:
        return await evaluation_service.start_attempt(req.quiz_id, current_user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{attempt_id}/submit", response_model=EvaluatedAttemptResponse)
async def submit_quiz_attempt(
    attempt_id: str,
    submission: SubmitAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits student responses for server-side evaluation.
    Executes deterministic grading on objective questions and rubric grading on subjective answers.
    Updates learning profile and detects weak concepts.
    """
    try:
        return await evaluation_service.evaluate_submission(
            attempt_id=attempt_id,
            user_id=current_user.id,
            submission=submission,
            db=db,
        )
    except ValueError as e:
        msg = str(e)
        if any(term in msg.lower() for term in ["not found", "unauthorized"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{attempt_id}/result", response_model=EvaluatedAttemptResponse)
@router.get("/{attempt_id}", response_model=EvaluatedAttemptResponse)
async def get_attempt_result(
    attempt_id: str,
    quiz_id: Optional[str] = Query(None, description="Optional quiz ID to verify ownership and quiz alignment"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full evaluation report, score breakdown, and source citations for an attempt."""
    try:
        return await evaluation_service.get_attempt_result(
            attempt_id=attempt_id,
            user_id=current_user.id,
            db=db,
            quiz_id=quiz_id,
        )
    except ValueError as e:
        msg = str(e)
        if any(term in msg.lower() for term in ["not found", "unauthorized", "not belong"]):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

@router.get("", response_model=List[RecentAttemptItem])
@router.get("/", response_model=List[RecentAttemptItem])
async def list_user_attempts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists recent exam attempts for the student."""
    res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .options(selectinload(QuizAttempt.quiz))
        .order_by(QuizAttempt.created_at.desc())
    )
    attempts = res.scalars().all()
    results = []
    for a in attempts:
        results.append(
            RecentAttemptItem(
                attempt_id=a.id,
                quiz_id=a.quiz_id,
                quiz_title=a.quiz.title if a.quiz else "Quiz",
                subject=a.quiz.subject if a.quiz else "General",
                percentage=a.percentage,
                total_score=a.total_score,
                max_score=round((a.total_score / (a.percentage / 100)), 1) if a.percentage > 0 else 10.0,
                is_passed=a.is_passed,
                submitted_at=a.submitted_at,
            )
        )
    return results
