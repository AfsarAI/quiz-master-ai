import asyncio
import logging
from celery_app import celery

logger = logging.getLogger(__name__)

@celery.task(name="tasks.embedder.embed_chunks_task")
def embed_chunks_task(texts: list):
    from app.services.embedding_service import embedding_service
    return asyncio.run(embedding_service.get_embeddings(texts))
