from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field

AttemptStatusType = Literal["IN_PROGRESS", "SUBMITTED", "EVALUATED", "TIMED_OUT"]

class StartAttemptRequest(BaseModel):
    quiz_id: str

class StartAttemptResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    started_at: datetime
    duration_minutes: int
    expires_at: datetime

class StudentAnswerItem(BaseModel):
    question_id: str
    selected_option_ids: List[str] = Field(default_factory=list)
    text_response: Optional[str] = None

class SubmitAttemptRequest(BaseModel):
    answers: List[StudentAnswerItem]

class CitationInfo(BaseModel):
    source_document: Optional[str] = None
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    quote: Optional[str] = None

class QuestionReviewItem(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    student_selection: List[str] = Field(default_factory=list)
    student_text_response: Optional[str] = None
    correct_options: List[str] = Field(default_factory=list)
    is_correct: bool
    marks_awarded: float
    max_marks: float
    explanation: str
    citation: Optional[CitationInfo] = None
    ai_feedback: Optional[str] = None
    key_points_missed: List[str] = Field(default_factory=list)

class EvaluatedAttemptResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    total_score: float
    max_score: float
    percentage: float
    is_passed: bool
    time_spent_seconds: int
    status: str
    question_reviews: List[QuestionReviewItem] = Field(default_factory=list)
    weak_areas_detected: List[str] = Field(default_factory=list)
    next_recommended_practice: Optional[str] = None

class SubjectiveGradingResult(BaseModel):
    score: float = Field(description="Numerical score awarded based on rubric")
    feedback: str = Field(description="Detailed pedagogical feedback on student answer")
    key_points_missed: List[str] = Field(default_factory=list, description="Key concepts or keywords missed")
