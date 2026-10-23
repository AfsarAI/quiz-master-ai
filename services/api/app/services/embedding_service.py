import os
import math
import hashlib
import logging
from typing import List
import numpy as np
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self.gemini_client = None
        self.openai_client = None

        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI Client: {e}")

        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize OpenAI Client: {e}")

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation with automatic provider fallbacks."""
        if not texts:
            return []

        import os
        is_test = os.environ.get("ENVIRONMENT") == "test" or settings.ENVIRONMENT == "test"
        if is_test:
            return [self._generate_pseudo_embedding(t) for t in texts]

        # 1. Try Gemini if configured
        if self.gemini_client and settings.GEMINI_API_KEY:
            try:
                results = []
                for text in texts:
                    resp = self.gemini_client.models.embed_content(
                        model=settings.DEFAULT_EMBEDDING_MODEL.replace("gemini/", ""),
                        contents=text,
                    )
                    # Handle returned embedding vector
                    vec = resp.embeddings[0].values
                    # If dimension differs from target (e.g. 768 vs 1536), pad or slice
                    vec = self._normalize_dimension(vec, self.dimension)
                    results.append(vec)
                return results
            except Exception as e:
                logger.warning(f"Gemini embedding API call failed: {e}. Trying fallback.")

        # 2. Try OpenAI if configured
        if self.openai_client and settings.OPENAI_API_KEY:
            try:
                resp = self.openai_client.embeddings.create(
                    model="text-embedding-3-small",
                    input=texts
                )
                return [d.embedding for d in resp.data]
            except Exception as e:
                logger.warning(f"OpenAI embedding API call failed: {e}. Trying fallback.")

        # 3. Deterministic semantic hash projection (offline / test mode)
        return [self._generate_pseudo_embedding(t) for t in texts]

    async def get_embedding(self, text: str) -> List[float]:
        res = await self.get_embeddings([text])
        return res[0]

    def _normalize_dimension(self, vec: List[float], target_dim: int) -> List[float]:
        curr_len = len(vec)
        if curr_len == target_dim:
            arr = np.array(vec, dtype=np.float32)
        elif curr_len > target_dim:
            arr = np.array(vec[:target_dim], dtype=np.float32)
        else:
            arr = np.pad(np.array(vec, dtype=np.float32), (0, target_dim - curr_len))

        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()

    def _generate_pseudo_embedding(self, text: str) -> List[float]:
        """
        Generates a deterministic 1536-dimensional unit vector from text tokens.
        Preserves cosine similarity: texts sharing vocabulary will have higher cosine similarity.
        """
        arr = np.zeros(self.dimension, dtype=np.float32)
        words = text.lower().split()
        if not words:
            arr[0] = 1.0
            return arr.tolist()

        for idx, word in enumerate(words):
            # Seed bucket from md5 of word
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            pos = h % self.dimension
            weight = 1.0 / math.sqrt(idx + 1)
            sign = 1.0 if (h % 2 == 0) else -1.0
            arr[pos] += sign * weight

        # Normalize to unit length
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        else:
            arr[0] = 1.0
        return arr.tolist()

embedding_service = EmbeddingService(dimension=settings.EMBEDDING_DIMENSION)
