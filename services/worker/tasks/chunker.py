import logging
from celery_app import celery

logger = logging.getLogger(__name__)

@celery.task(name="tasks.chunker.chunk_document_task")
def chunk_document_task(pages: list, document_id: str, source_title: str):
    from app.services.chunker import chunker
    return chunker.chunk_pages(pages, document_id, source_title)
