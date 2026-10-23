import os
import sys
from celery import Celery

# Add app_shared or parent services to path if mounted
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("../api"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6382/0")

celery = Celery(
    "quizmaster_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.parser",
        "tasks.chunker",
        "tasks.embedder",
        "tasks.generator",
        "tasks.evaluator",
    ]
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
)

if __name__ == "__main__":
    celery.start()
