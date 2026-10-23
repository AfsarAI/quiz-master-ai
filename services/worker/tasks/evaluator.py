import asyncio
import logging
from celery_app import celery

logger = logging.getLogger(__name__)

@celery.task(name="tasks.evaluator.evaluate_submission_task", bind=True)
def evaluate_submission_task(self, attempt_id: str, user_id: str, submission_data: dict):
    """Celery task for subjective question evaluations."""
    logger.info(f"Evaluating submission for attempt {attempt_id}")
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.evaluation_service import evaluation_service
        from app.schemas.attempt import SubmitAttemptRequest

        async def _run():
            async with AsyncSessionLocal() as db:
                sub = SubmitAttemptRequest.model_validate(submission_data)
                result = await evaluation_service.evaluate_submission(attempt_id, user_id, sub, db)
                return result.model_dump()

        res = asyncio.run(_run())
        return {"status": "SUCCESS", "result": res}
    except Exception as exc:
        logger.exception(f"Submission evaluation task failed: {exc}")
        raise self.retry(exc=exc, countdown=5)
