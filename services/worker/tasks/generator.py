import asyncio
import logging
from celery_app import celery

logger = logging.getLogger(__name__)

@celery.task(name="tasks.generator.generate_quiz_task", bind=True, max_retries=2)
def generate_quiz_task(self, quiz_params: dict, creator_id: str):
    """Celery task for intensive RAG quiz generation."""
    logger.info(f"Starting Celery quiz generation task for user {creator_id}")
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.quiz_service import quiz_service
        from app.schemas.quiz import QuizGenerateRequest

        async def _run():
            async with AsyncSessionLocal() as db:
                req = QuizGenerateRequest.model_validate(quiz_params)
                quiz = await quiz_service.generate_quiz_from_document(req, creator_id, db)
                return quiz.id

        quiz_id = asyncio.run(_run())
        return {"status": "SUCCESS", "quiz_id": quiz_id}
    except Exception as exc:
        logger.exception(f"Quiz generation task failed: {exc}")
        raise self.retry(exc=exc, countdown=5)
