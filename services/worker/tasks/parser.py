import asyncio
import logging
from celery_app import celery

logger = logging.getLogger(__name__)

@celery.task(name="tasks.parser.process_document_task", bind=True, max_retries=3)
def process_document_task(self, document_id: str):
    """Celery task for document text extraction, chunking, and vector embedding."""
    logger.info(f"Starting Celery task for document processing: {document_id}")
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.quiz_service import quiz_service

        async def _run():
            async with AsyncSessionLocal() as db:
                await quiz_service.process_document_pipeline(document_id, db)

        asyncio.run(_run())
        return {"status": "SUCCESS", "document_id": document_id}
    except Exception as exc:
        logger.exception(f"Document processing failed for {document_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
