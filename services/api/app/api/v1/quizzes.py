import uuid
from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.quiz import Quiz, Question, QuestionOption
from app.models.attempt import QuizAttempt
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizOutStudent,
    QuizOutAdmin,
    QuestionOutStudent,
    QuestionOutAdmin,
    OptionOutStudent,
    OptionOutAdmin,
)
from app.services.quiz_service import quiz_service

router = APIRouter(prefix="/quizzes", tags=["Quiz Generation & Management"])

@router.post("/generate", response_model=QuizGenerateResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_quiz(
    req: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates a source-grounded quiz using RAG over indexed document chunks."""
    try:
        quiz = await quiz_service.generate_quiz_from_document(req, current_user.id, db)
        return QuizGenerateResponse(
            quiz_id=quiz.id,
            status="READY",
            message="AI has generated verified questions strictly grounded in your document.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quiz generation failed: {str(e)}"
        )

@router.get("/{quiz_id}", response_model=Union[QuizOutAdmin, QuizOutStudent])
async def get_quiz(
    quiz_id: str,
    mode: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves quiz definition.
    SECURITY GUARANTEE: For students and active test-takers, correct options, rubrics, and explanations
    are stripped to prevent client-side inspection / cheating.
    """
    res = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.questions)
            .selectinload(Question.options)
        )
    )
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    # Educators and admins viewing in non-exam mode see full admin answer keys
    is_admin_educator = (current_user.role in ["admin", "educator"]) and (mode != "exam")

    if is_admin_educator:
        admin_questions = []
        for q in quiz.questions:
            options = [
                OptionOutAdmin(
                    id=opt.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    option_order=opt.option_order,
                )
                for opt in q.options
            ]
            admin_questions.append(
                QuestionOutAdmin(
                    id=q.id,
                    quiz_id=q.quiz_id,
                    chunk_id=q.chunk_id,
                    question_type=q.question_type,
                    question_text=q.question_text,
                    points=q.points,
                    order_index=q.order_index,
                    explanation=q.explanation,
                    citation_quote=q.citation_quote,
                    rubric_criteria=q.rubric_criteria,
                    options=options,
                )
            )
        return QuizOutAdmin(
            id=quiz.id,
            creator_id=quiz.creator_id,
            document_id=quiz.document_id,
            title=quiz.title,
            description=quiz.description,
            subject=quiz.subject,
            grade_level=quiz.grade_level,
            difficulty=quiz.difficulty,
            duration_minutes=quiz.duration_minutes,
            pass_percentage=quiz.pass_percentage,
            is_published=quiz.is_published,
            generation_params=quiz.generation_params or {},
            total_questions=len(quiz.questions),
            questions=admin_questions,
            created_at=quiz.created_at,
        )

    # Otherwise return student-safe view: STRIP answer keys, explanations, and rubrics
    student_questions = []
    for q in quiz.questions:
        options = [
            OptionOutStudent(
                id=opt.id,
                option_text=opt.option_text,
                option_order=opt.option_order,
            )
            for opt in q.options
        ]
        student_questions.append(
            QuestionOutStudent(
                id=q.id,
                quiz_id=q.quiz_id,
                question_type=q.question_type,
                question_text=q.question_text,
                points=q.points,
                order_index=q.order_index,
                options=options,
            )
        )

    return QuizOutStudent(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        subject=quiz.subject,
        grade_level=quiz.grade_level,
        difficulty=quiz.difficulty,
        duration_minutes=quiz.duration_minutes,
        pass_percentage=quiz.pass_percentage,
        total_questions=len(quiz.questions),
        questions=student_questions,
        created_at=quiz.created_at,
    )

@router.get("", response_model=List[QuizOutStudent])
@router.get("/", response_model=List[QuizOutStudent])
async def list_quizzes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists available quizzes."""
    res = await db.execute(
        select(Quiz)
        .where(Quiz.is_published == True)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.created_at.desc())
    )
    quizzes = res.scalars().all()
    results = []
    for q in quizzes:
        results.append(
            QuizOutStudent(
                id=q.id,
                title=q.title,
                description=q.description,
                subject=q.subject,
                grade_level=q.grade_level,
                difficulty=q.difficulty,
                duration_minutes=q.duration_minutes,
                pass_percentage=q.pass_percentage,
                total_questions=len(q.questions),
                questions=[],
                created_at=q.created_at,
            )
        )
    return results
