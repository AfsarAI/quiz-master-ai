import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.document import Document, DocumentChunk
from app.models.quiz import Quiz, Question, QuestionOption
from app.services.storage_service import storage_service
from app.services.text_extractor import text_extractor
from app.services.chunker import chunker
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.schemas.quiz import QuizGenerateRequest

logger = logging.getLogger(__name__)

class QuizService:
    @staticmethod
    async def process_document_pipeline(document_id: str, db: AsyncSession):
        """
        Background task: extracts text, chunks document, generates embeddings,
        and saves chunks into the database.
        """
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {document_id} not found for ingestion pipeline.")
            return

        try:
            doc.status = "PROCESSING"
            await db.commit()

            file_bytes = await storage_service.read_file(doc.file_key)
            pages, meta = text_extractor.extract(file_bytes, doc.file_type, doc.title)

            if not pages:
                raise ValueError("No readable text found in document.")

            chunks_data = chunker.chunk_pages(pages, doc.id, doc.title)
            if not chunks_data:
                raise ValueError("Could not produce text chunks from document.")

            chunk_texts = [c["content"] for c in chunks_data]
            embeddings = await embedding_service.get_embeddings(chunk_texts)

            # Insert chunks into database
            for idx, c in enumerate(chunks_data):
                chunk_obj = DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc.id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    page_number=c["page_number"],
                    section_heading=c["section_heading"],
                    token_count=c["token_count"],
                    embedding=embeddings[idx],
                )
                db.add(chunk_obj)

            doc.status = "READY"
            doc.page_count = meta.get("page_count", len(pages))
            doc.chunk_count = len(chunks_data)
            # Merge extracted topics into metadata_json
            current_meta = dict(doc.metadata_json or {})
            current_meta["extracted_topics"] = meta.get("extracted_topics", [])
            current_meta["author"] = meta.get("author", "Unknown")
            doc.metadata_json = current_meta

            await db.commit()
            logger.info(f"Document {document_id} successfully processed: {len(chunks_data)} chunks embedded.")

        except Exception as e:
            logger.exception(f"Error processing document {document_id}: {e}")
            await db.rollback()
            # Update status to FAILED
            doc_res = await db.execute(select(Document).where(Document.id == document_id))
            f_doc = doc_res.scalar_one_or_none()
            if f_doc:
                f_doc.status = "FAILED"
                f_doc.error_message = str(e)
                await db.commit()

    @staticmethod
    async def generate_quiz_from_document(
        req: QuizGenerateRequest,
        creator_id: str,
        db: AsyncSession
    ) -> Quiz:
        """
        Retrieves grounded chunks and generates a structured Quiz.
        """
        # Verify document exists and belongs to user
        doc_res = await db.execute(
            select(Document).where(Document.id == req.document_id, Document.user_id == creator_id)
        )
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise ValueError("Document not found or access denied.")

        if doc.status != "READY":
            raise ValueError(f"Document is not ready for quiz generation (status: {doc.status}).")

        # Fetch chunks for this document
        chunks_res = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index)
        )
        chunks = chunks_res.scalars().all()
        if not chunks:
            raise ValueError("No document chunks available for quiz generation.")

        # If topic focus provided, perform vector search / keyword ranking
        selected_chunks = []
        if req.topic_focus:
            query_text = " ".join(req.topic_focus)
            query_vec = await embedding_service.get_embedding(query_text)
            
            # Simple cosine similarity scoring across chunks
            import numpy as np
            q_arr = np.array(query_vec, dtype=np.float32)
            scored = []
            for c in chunks:
                c_emb = c.embedding
                if isinstance(c_emb, list):
                    c_arr = np.array(c_emb, dtype=np.float32)
                    sim = float(np.dot(q_arr, c_arr) / (np.linalg.norm(q_arr) * np.linalg.norm(c_arr) + 1e-9))
                else:
                    sim = 0.5
                scored.append((sim, c))
            scored.sort(key=lambda x: x[0], reverse=True)
            selected_chunks = [item[1] for item in scored[:min(len(chunks), max(10, req.question_count * 2))]]
        else:
            selected_chunks = chunks[:min(len(chunks), max(10, req.question_count * 2))]

        context_for_llm = [
            {
                "chunk_index": c.chunk_index,
                "content": c.content,
                "page_number": c.page_number,
                "section_heading": c.section_heading,
                "db_id": c.id
            }
            for c in selected_chunks
        ]

        # Call LLM service for structured generation
        generated = await llm_service.generate_grounded_quiz(
            context_chunks=context_for_llm,
            title=req.title,
            subject=req.subject or "Educational Assessment",
            grade_level=req.grade_level or "Undergraduate",
            difficulty=req.difficulty,
            question_count=req.question_count,
            question_types=req.question_types or ["single_choice", "multi_choice", "true_false", "short_answer"],
            topic_focus=req.topic_focus,
        )

        # Map context chunk index back to database chunk_id
        chunk_map = {c["chunk_index"]: c["db_id"] for c in context_for_llm}

        quiz = Quiz(
            id=str(uuid.uuid4()),
            creator_id=creator_id,
            document_id=doc.id,
            title=generated.quiz_title or req.title,
            description=f"AI-generated grounded quiz on {req.subject} ({req.difficulty} difficulty).",
            subject=generated.subject or req.subject or "General",
            grade_level=req.grade_level,
            difficulty=req.difficulty,
            duration_minutes=req.duration_minutes,
            pass_percentage=60.0,
            is_published=True,
            generation_params={
                "topic_focus": req.topic_focus,
                "requested_count": req.question_count,
                "difficulty": req.difficulty,
            }
        )
        db.add(quiz)

        for q_idx, q_gen in enumerate(generated.questions):
            target_chunk_id = chunk_map.get(q_gen.context_chunk_index)
            if not target_chunk_id and context_for_llm:
                target_chunk_id = context_for_llm[0]["db_id"]

            question = Question(
                id=str(uuid.uuid4()),
                quiz_id=quiz.id,
                chunk_id=target_chunk_id,
                question_type=q_gen.question_type,
                question_text=q_gen.question_text,
                points=q_gen.points,
                order_index=q_idx + 1,
                explanation=q_gen.explanation,
                citation_quote=q_gen.citation_quote,
                rubric_criteria=q_gen.rubric_criteria,
            )
            db.add(question)

            # Add options for choice questions
            for o_idx, opt_gen in enumerate(q_gen.options):
                option = QuestionOption(
                    id=str(uuid.uuid4()),
                    question_id=question.id,
                    option_text=opt_gen.text,
                    is_correct=opt_gen.is_correct,
                    option_order=o_idx + 1,
                )
                db.add(option)

        await db.commit()
        await db.refresh(quiz)
        return quiz

quiz_service = QuizService()
