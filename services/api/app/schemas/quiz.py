from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

QuestionType = Literal["single_choice", "multi_choice", "true_false", "short_answer"]
QuizDifficulty = Literal["easy", "medium", "hard", "adaptive"]

# Option schemas
class OptionCreate(BaseModel):
    option_text: str
    is_correct: bool
    option_order: int

class OptionOutStudent(BaseModel):
    id: str
    option_text: str
    option_order: int

    model_config = ConfigDict(from_attributes=True)

class OptionOutAdmin(OptionOutStudent):
    is_correct: bool

# Question schemas
class QuestionOutStudent(BaseModel):
    id: str
    quiz_id: str
    question_type: QuestionType
    question_text: str
    points: float
    order_index: int
    options: List[OptionOutStudent] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class QuestionOutAdmin(QuestionOutStudent):
    chunk_id: Optional[str] = None
    explanation: str
    citation_quote: Optional[str] = None
    rubric_criteria: Optional[Dict[str, Any]] = None
    options: List[OptionOutAdmin] = Field(default_factory=list)

# Quiz schemas
class QuizBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject: str
    grade_level: Optional[str] = None
    difficulty: QuizDifficulty = "medium"
    duration_minutes: int = 15
    pass_percentage: float = 60.0

class QuizCreate(QuizBase):
    document_id: Optional[str] = None

class QuizOutStudent(QuizBase):
    id: str
    total_questions: int = 0
    questions: List[QuestionOutStudent] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuizOutAdmin(QuizBase):
    id: str
    creator_id: str
    document_id: Optional[str] = None
    is_published: bool
    generation_params: Dict[str, Any] = Field(default_factory=dict)
    total_questions: int = 0
    questions: List[QuestionOutAdmin] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuizGenerateRequest(BaseModel):
    document_id: str
    title: str
    grade_level: Optional[str] = "Undergraduate"
    subject: Optional[str] = "General Knowledge"
    topic_focus: Optional[List[str]] = Field(default_factory=list)
    difficulty: QuizDifficulty = "medium"
    question_count: int = Field(default=5, ge=1, le=50)
    duration_minutes: int = Field(default=15, ge=1, le=180)
    question_types: Optional[List[QuestionType]] = Field(
        default_factory=lambda: ["single_choice", "multi_choice", "true_false", "short_answer"]
    )

class QuizGenerateResponse(BaseModel):
    quiz_id: str
    task_id: Optional[str] = None
    status: Literal["GENERATING", "READY", "FAILED"] = "GENERATING"
    message: str

# Pydantic Schemas for Structured LLM Extraction (Instructor / JSON Mode)
class GeneratedOption(BaseModel):
    text: str = Field(description="Option text content")
    is_correct: bool = Field(description="True if this is the correct answer, False otherwise")

class GeneratedQuestion(BaseModel):
    question_text: str = Field(description="Clear, unambiguous question grounded strictly in context")
    question_type: QuestionType = Field(description="single_choice, multi_choice, true_false, or short_answer")
    points: float = Field(default=1.0, description="Marks/points allocated for this question")
    options: List[GeneratedOption] = Field(default_factory=list, description="List of options (e.g. 4 for multiple choice, 2 for true_false)")
    explanation: str = Field(description="Detailed rationale explaining why the correct answer is right and distractors are wrong")
    citation_quote: str = Field(description="Verbatim excerpt from the context supporting this question")
    context_chunk_index: int = Field(default=0, description="Index of the provided chunk used")
    rubric_criteria: Optional[Dict[str, Any]] = Field(default=None, description="Scoring criteria/keywords for short_answer questions")

class GeneratedQuiz(BaseModel):
    quiz_title: str
    subject: str
    difficulty: str
    questions: List[GeneratedQuestion]
