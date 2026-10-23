from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.attempt import QuizAttempt, UserWeakArea
from app.models.quiz import Quiz
from app.models.document import Document
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    UserWeakAreaOut,
    RecentAttemptItem,
    AdaptiveQuizRequest,
)
from app.schemas.quiz import QuizGenerateRequest
from app.services.quiz_service import quiz_service

class AnalyticsService:
    @staticmethod
    async def get_user_analytics(user_id: str, db: AsyncSession) -> AnalyticsSummaryResponse:
        """Aggregates learning metrics, weak concepts, and performance history."""
        # Query completed attempts
        att_res = await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user_id, QuizAttempt.status == "EVALUATED")
            .options(selectinload(QuizAttempt.quiz))
            .order_by(QuizAttempt.submitted_at.desc())
        )
        attempts = att_res.scalars().all()

        total_quizzes = len(attempts)
        total_time_seconds = sum(a.time_spent_seconds for a in attempts)
        avg_score = round(sum(a.percentage for a in attempts) / max(1, total_quizzes), 1) if total_quizzes else 0.0

        # Mastery by subject
        subject_scores: Dict[str, List[float]] = {}
        for a in attempts:
            sub = a.quiz.subject if a.quiz else "General"
            if sub not in subject_scores:
                subject_scores[sub] = []
            subject_scores[sub].append(a.percentage)

        mastery_by_subject = {
            sub: round(sum(scores) / len(scores), 1)
            for sub, scores in subject_scores.items()
        }

        # Query weak areas
        wa_res = await db.execute(
            select(UserWeakArea)
            .where(UserWeakArea.user_id == user_id)
            .order_by(UserWeakArea.failure_count.desc(), UserWeakArea.mastery_score.asc())
            .limit(10)
        )
        weak_areas = wa_res.scalars().all()

        recent_items = [
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
            for a in attempts[:8]
        ]

        return AnalyticsSummaryResponse(
            total_quizzes_taken=total_quizzes,
            average_score_percentage=avg_score,
            total_study_time_minutes=int(total_time_seconds / 60),
            mastery_by_subject=mastery_by_subject,
            weak_areas=[UserWeakAreaOut.model_validate(w) for w in weak_areas],
            recent_attempts=recent_items,
        )

    @staticmethod
    async def create_adaptive_remediation_quiz(
        user_id: str,
        req: AdaptiveQuizRequest,
        db: AsyncSession
    ) -> Quiz:
        """
        Dynamically designs a focused remediation quiz targeting detected weak spots.
        """
        # Determine target weak topics
        topics = req.target_topics or []
        if not topics:
            wa_res = await db.execute(
                select(UserWeakArea)
                .where(UserWeakArea.user_id == user_id)
                .order_by(UserWeakArea.failure_count.desc())
                .limit(4)
            )
            top_weak = wa_res.scalars().all()
            topics = [w.topic for w in top_weak]

        # Find document associated with user
        doc_res = await db.execute(
            select(Document)
            .where(Document.user_id == user_id, Document.status == "READY")
            .order_by(Document.created_at.desc())
        )
        doc = doc_res.scalars().first()
        if not doc:
            raise ValueError("No ingested study documents available to generate an adaptive quiz.")

        sub = req.subject or doc.title.replace(".pdf", "").replace(".docx", "")
        quiz_title = f"Adaptive Practice: {', '.join(topics[:2]) if topics else sub}"

        gen_req = QuizGenerateRequest(
            document_id=doc.id,
            title=quiz_title,
            subject=sub,
            topic_focus=topics,
            difficulty="adaptive",
            question_count=req.question_count,
            duration_minutes=15,
        )

        return await quiz_service.generate_quiz_from_document(gen_req, user_id, db)

analytics_service = AnalyticsService()
