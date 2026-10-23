from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

DocumentStatusType = Literal["QUEUED", "PROCESSING", "READY", "FAILED"]

class DocumentBase(BaseModel):
    title: str

class DocumentCreate(DocumentBase):
    file_key: str
    file_type: str
    file_size_bytes: int

class DocumentOut(DocumentBase):
    id: str
    user_id: str
    file_key: str
    file_type: str
    file_size_bytes: int
    status: str
    error_message: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    page_count: int = 0
    chunk_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentStatusResponse(BaseModel):
    document_id: str
    title: str
    status: str
    page_count: int
    chunk_count: int
    extracted_topics: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    document_id: str
    title: str
    status: str = "PROCESSING"
    estimated_seconds: int = 15

class DocumentChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    token_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
