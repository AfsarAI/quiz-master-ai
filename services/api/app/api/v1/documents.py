import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db, get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.schemas.document import (
    DocumentOut,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DocumentChunkOut,
)
from app.services.storage_service import storage_service
from app.services.quiz_service import quiz_service

router = APIRouter(prefix="/documents", tags=["Document Ingestion"])

async def _run_doc_pipeline(document_id: str):
    async with get_session() as session:
        await quiz_service.process_document_pipeline(document_id, session)

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads educational material (PDF, DOCX, TXT), validates magic bytes,
    and dispatches background text extraction, chunking, and vector embedding.
    """
    file_bytes = await file.read()
    filename = file.filename or "uploaded_document.pdf"
    doc_title = title.strip() if (title and title.strip()) else filename

    try:
        file_key, mime_type, file_size = await storage_service.save_file(
            file_content=file_bytes,
            filename=filename,
            user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    doc = Document(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=doc_title,
        file_key=file_key,
        file_type=mime_type,
        file_size_bytes=file_size,
        status="PROCESSING",
        metadata_json={},
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Dispatch ingestion worker task in background
    background_tasks.add_task(_run_doc_pipeline, doc.id)

    return DocumentUploadResponse(
        document_id=doc.id,
        title=doc.title,
        status=doc.status,
        estimated_seconds=15,
    )

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pollable endpoint for tracking ingestion and indexing progress."""
    res = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    extracted_topics = []
    if doc.metadata_json and isinstance(doc.metadata_json, dict):
        extracted_topics = doc.metadata_json.get("extracted_topics", [])

    return DocumentStatusResponse(
        document_id=doc.id,
        title=doc.title,
        status=doc.status,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        extracted_topics=extracted_topics,
        error_message=doc.error_message,
    )

@router.get("/", response_model=List[DocumentOut])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all documents uploaded by the current user."""
    res = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return res.scalars().all()

@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return doc

@router.get("/{document_id}/chunks", response_model=List[DocumentChunkOut])
async def get_document_chunks(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    res = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    return chunks_res.scalars().all()
