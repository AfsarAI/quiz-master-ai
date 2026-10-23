import uuid
from datetime import datetime, timezone, timedelta
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.quiz import Quiz, Question, QuestionOption
from app.models.attempt import QuizAttempt, AttemptAnswer, UserWeakArea
from app.models.document import Document, DocumentChunk
from app.services.llm_service import llm_service
from app.schemas.attempt import (
    StartAttemptResponse,
    SubmitAttemptRequest,
    EvaluatedAttemptResponse,
    QuestionReviewItem,
    CitationInfo,
)

logger = logging.getLogger(__name__)

def _to_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class EvaluationService:
    @staticmethod
    async def start_attempt(quiz_id: str, user_id: str, db: AsyncSession) -> StartAttemptResponse:
        """Starts an exam attempt, tracks duration and sets expiration timestamp."""
        quiz_res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = quiz_res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        # Check for existing IN_PROGRESS attempt to resume if unexpired
        existing_res = await db.execute(
            select(QuizAttempt)
            .where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == user_id,
                QuizAttempt.status == "IN_PROGRESS"
            )
            .order_by(QuizAttempt.started_at.desc())
        )
        existing = existing_res.scalars().first()
        now = datetime.now(timezone.utc)

        if existing:
            # Check if expired
            started = _to_utc(existing.started_at)
            expiry = started + timedelta(minutes=quiz.duration_minutes)
            if now < expiry:
                return StartAttemptResponse(
                    attempt_id=existing.id,
                    quiz_id=quiz.id,
                    started_at=started,
                    duration_minutes=quiz.duration_minutes,
                    expires_at=expiry,
                )
            else:
                existing.status = "TIMED_OUT"
                await db.commit()

        # Create fresh attempt
        attempt = QuizAttempt(
            id=str(uuid.uuid4()),
            quiz_id=quiz.id,
            user_id=user_id,
            status="IN_PROGRESS",
            started_at=now,
        )
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)

        expires_at = attempt.started_at + timedelta(minutes=quiz.duration_minutes)
        return StartAttemptResponse(
            attempt_id=attempt.id,
            quiz_id=quiz.id,
            started_at=attempt.started_at,
            duration_minutes=quiz.duration_minutes,
            expires_at=expires_at,
        )

    @staticmethod
    async def evaluate_submission(
        attempt_id: str,
        user_id: str,
        submission: SubmitAttemptRequest,
        db: AsyncSession
    ) -> EvaluatedAttemptResponse:
        """
        Rigorously evaluates an exam submission server-side.
        Guarantees zero client-side trust.
        """
        # Fetch attempt with quiz
        att_res = await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
        )
        attempt = att_res.scalar_one_or_none()
        if not attempt:
            raise ValueError("Exam attempt not found or unauthorized.")

        if attempt.status in ["SUBMITTED", "EVALUATED"]:
            # If already evaluated, return existing results
            return await EvaluationService.get_attempt_result(attempt.id, user_id, db)

        # Clear any prior answers for this attempt to ensure idempotency and prevent duplicates
        from sqlalchemy import delete
        await db.execute(delete(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id))

        # Load quiz with questions, options, and chunks
        q_res = await db.execute(
            select(Quiz)
            .where(Quiz.id == attempt.quiz_id)
            .options(
                selectinload(Quiz.questions)
                .selectinload(Question.options),
                selectinload(Quiz.questions)
                .selectinload(Question.chunk)
                .selectinload(DocumentChunk.document),
            )
        )
        quiz = q_res.scalar_one()

        now = datetime.now(timezone.utc)
        started_at = _to_utc(attempt.started_at)
        time_spent_seconds = max(0, int((now - started_at).total_seconds()))
        # Buffer of 60 seconds grace period for network latency
        grace_period_seconds = (quiz.duration_minutes * 60) + 60
        is_timed_out = time_spent_seconds > grace_period_seconds

        # Map student answers by question_id
        student_answers_map = {a.question_id: a for a in submission.answers}

        total_score = 0.0
        max_score = 0.0
        question_reviews: List[QuestionReviewItem] = []
        weak_topics = set()

        for question in quiz.questions:
            max_score += question.points
            s_ans = student_answers_map.get(question.id)
            selected_ids = s_ans.selected_option_ids if s_ans else []
            text_response = s_ans.text_response if s_ans else None

            is_correct = False
            marks_awarded = 0.0
            ai_feedback = None
            key_points_missed = []
            correct_option_ids = [opt.id for opt in question.options if opt.is_correct]

            if question.question_type in ["single_choice", "true_false"]:
                if selected_ids and correct_option_ids:
                    # Exactly matches correct option
                    if set(selected_ids) == set(correct_option_ids):
                        is_correct = True
                        marks_awarded = question.points

            elif question.question_type == "multi_choice":
                if selected_ids and correct_option_ids:
                    # Full credit for exact match, partial credit proportional to selections
                    selected_set = set(selected_ids)
                    correct_set = set(correct_option_ids)
                    if selected_set == correct_set:
                        is_correct = True
                        marks_awarded = question.points
                    elif selected_set.issubset(correct_set):
                        ratio = len(selected_set) / len(correct_set)
                        marks_awarded = round(question.points * ratio, 2)
                        is_correct = (marks_awarded == question.points)

            elif question.question_type == "short_answer":
                # Evaluate using LLM / rubric
                eval_res = await llm_service.evaluate_subjective_answer(
                    question_text=question.question_text,
                    citation_quote=question.citation_quote,
                    rubric_criteria=question.rubric_criteria,
                    student_response=text_response or "",
                    max_points=question.points,
                )
                marks_awarded = eval_res.score
                ai_feedback = eval_res.feedback
                key_points_missed = eval_res.key_points_missed
                is_correct = marks_awarded >= (question.points * 0.7)

            total_score += marks_awarded

            # Build Citation Info
            citation = None
            if question.chunk:
                citation = CitationInfo(
                    source_document=question.chunk.document.title if question.chunk.document else "Uploaded Document",
                    page_number=question.chunk.page_number,
                    section_heading=question.chunk.section_heading,
                    quote=question.citation_quote or (question.chunk.content[:200] if question.chunk.content else None)
                )

            # Record AttemptAnswer in DB
            attempt_answer = AttemptAnswer(
                id=str(uuid.uuid4()),
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option_ids=selected_ids,
                text_response=text_response,
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                ai_feedback=ai_feedback,
                key_points_missed=key_points_missed,
            )
            db.add(attempt_answer)

            # If student answered incorrectly or received low marks, flag as weak concept
            if not is_correct:
                topic_name = question.citation_quote[:60] if question.citation_quote else quiz.subject
                weak_topics.add(topic_name)
                await EvaluationService._record_weak_area(
                    user_id=user_id,
                    subject=quiz.subject,
                    topic=topic_name,
                    db=db
                )

            question_reviews.append(QuestionReviewItem(
                question_id=question.id,
                question_text=question.question_text,
                question_type=question.question_type,
                student_selection=selected_ids,
                student_text_response=text_response,
                correct_options=correct_option_ids,
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                max_marks=question.points,
                explanation=question.explanation or "",
                citation=citation,
                ai_feedback=ai_feedback,
                key_points_missed=key_points_missed,
            ))

        # Calculate final percentage
        percentage = round((total_score / max(1.0, max_score)) * 100, 1)
        is_passed = percentage >= quiz.pass_percentage

        attempt.status = "TIMED_OUT" if is_timed_out else "EVALUATED"
        attempt.submitted_at = now
        attempt.time_spent_seconds = time_spent_seconds
        attempt.total_score = round(total_score, 2)
        attempt.percentage = percentage
        attempt.is_passed = is_passed

        await db.commit()

        next_rec = None
        if weak_topics:
            next_rec = f"Focus practice on: {', '.join(list(weak_topics)[:2])}."
        elif is_passed:
            next_rec = "Mastery demonstrated! Try advancing to a higher difficulty assessment."
        else:
            next_rec = "Review your explanations and citations above."

        return EvaluatedAttemptResponse(
            attempt_id=attempt.id,
            quiz_id=quiz.id,
            total_score=round(total_score, 2),
            max_score=round(max_score, 2),
            percentage=percentage,
            is_passed=is_passed,
            time_spent_seconds=time_spent_seconds,
            status=attempt.status,
            question_reviews=question_reviews,
            weak_areas_detected=list(weak_topics),
            next_recommended_practice=next_rec,
        )

    @staticmethod
    async def get_attempt_result(
        attempt_id: str,
        user_id: str,
        db: AsyncSession,
        quiz_id: Optional[str] = None
    ) -> EvaluatedAttemptResponse:
        """Retrieves previously evaluated attempt result with full review breakdowns."""
        clean_attempt_id = attempt_id.strip() if attempt_id else ""
        att_res = await db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.id == clean_attempt_id, QuizAttempt.user_id == user_id)
            .options(
                selectinload(QuizAttempt.answers).selectinload(AttemptAnswer.question).selectinload(Question.options),
                selectinload(QuizAttempt.answers).selectinload(AttemptAnswer.question).selectinload(Question.chunk).selectinload(DocumentChunk.document),
                selectinload(QuizAttempt.quiz).selectinload(Quiz.questions).selectinload(Question.options),
                selectinload(QuizAttempt.quiz).selectinload(Quiz.questions).selectinload(Question.chunk).selectinload(DocumentChunk.document),
            )
        )
        attempt = att_res.scalar_one_or_none()
        if not attempt:
            raise ValueError("Attempt not found or unauthorized.")

        if quiz_id and attempt.quiz_id != quiz_id.strip():
            raise ValueError("Attempt does not belong to the specified quiz.")

        if attempt.status == "IN_PROGRESS":
            raise ValueError("Attempt is still in progress and has not been submitted.")

        reviews = []
        max_score = 0.0
        weak_topics = set()
        ans_map = {ans.question_id: ans for ans in attempt.answers if ans.question_id}

        # Order questions using the quiz's defined question ordering
        questions = (
            attempt.quiz.questions
            if (attempt.quiz and attempt.quiz.questions)
            else [ans.question for ans in sorted(attempt.answers, key=lambda a: a.question.order_index if a.question else 0) if ans.question]
        )

        for q in questions:
            if not q:
                continue
            max_score += q.points
            ans = ans_map.get(q.id)

            citation = None
            if q.chunk:
                citation = CitationInfo(
                    source_document=q.chunk.document.title if (q.chunk.document and q.chunk.document.title) else "Uploaded Document",
                    page_number=q.chunk.page_number,
                    section_heading=q.chunk.section_heading,
                    quote=q.citation_quote or (q.chunk.content[:200] if q.chunk.content else None)
                )
            correct_opts = [opt.id for opt in (q.options or []) if opt.is_correct]

            is_correct = ans.is_correct if (ans and ans.is_correct is not None) else False
            marks_awarded = ans.marks_awarded if ans else 0.0
            student_selection = (ans.selected_option_ids or []) if ans else []
            student_text_response = ans.text_response if ans else None
            ai_feedback = ans.ai_feedback if ans else None
            key_points_missed = (ans.key_points_missed or []) if ans else []

            if not is_correct:
                topic_name = q.citation_quote[:60] if q.citation_quote else (attempt.quiz.subject if attempt.quiz else "Subject Topic")
                weak_topics.add(topic_name)

            reviews.append(QuestionReviewItem(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                student_selection=student_selection,
                student_text_response=student_text_response,
                correct_options=correct_opts,
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                max_marks=q.points,
                explanation=q.explanation or "",
                citation=citation,
                ai_feedback=ai_feedback,
                key_points_missed=key_points_missed,
            ))

        next_rec = None
        if weak_topics:
            next_rec = f"Focus practice on: {', '.join(list(weak_topics)[:2])}."
        elif attempt.is_passed:
            next_rec = "Mastery demonstrated! Try advancing to a higher difficulty assessment."
        else:
            next_rec = "Review your explanations and citations above."

        return EvaluatedAttemptResponse(
            attempt_id=attempt.id,
            quiz_id=attempt.quiz_id,
            total_score=attempt.total_score,
            max_score=round(max_score, 2),
            percentage=attempt.percentage,
            is_passed=attempt.is_passed,
            time_spent_seconds=attempt.time_spent_seconds,
            status=attempt.status,
            question_reviews=reviews,
            weak_areas_detected=list(weak_topics),
            next_recommended_practice=next_rec,
        )

    @staticmethod
    async def _record_weak_area(user_id: str, subject: str, topic: str, db: AsyncSession):
        """Updates or inserts a UserWeakArea record for personalized remediation."""
        clean_topic = topic[:120].strip()
        res = await db.execute(
            select(UserWeakArea).where(
                UserWeakArea.user_id == user_id,
                UserWeakArea.subject == subject,
                UserWeakArea.topic == clean_topic
            )
        )
        existing = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if existing:
            existing.failure_count += 1
            existing.mastery_score = max(0.0, round(existing.mastery_score - 0.15, 2))
            existing.last_attempted_at = now
        else:
            new_wa = UserWeakArea(
                id=str(uuid.uuid4()),
                user_id=user_id,
                subject=subject,
                topic=clean_topic,
                failure_count=1,
                mastery_score=0.2,
                last_attempted_at=now
            )
            db.add(new_wa)

evaluation_service = EvaluationService()
