from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class UserWeakAreaOut(BaseModel):
    id: str
    user_id: str
    subject: str
    topic: str
    failure_count: int
    mastery_score: float
    last_attempted_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RecentAttemptItem(BaseModel):
    attempt_id: str
    quiz_id: str
    quiz_title: str
    subject: str
    percentage: float
    total_score: float
    max_score: float
    is_passed: bool
    submitted_at: Optional[datetime] = None

class AnalyticsSummaryResponse(BaseModel):
    total_quizzes_taken: int
    average_score_percentage: float
    total_study_time_minutes: int
    mastery_by_subject: Dict[str, float] = Field(default_factory=dict)
    weak_areas: List[UserWeakAreaOut] = Field(default_factory=list)
    recent_attempts: List[RecentAttemptItem] = Field(default_factory=list)

class AdaptiveQuizRequest(BaseModel):
    subject: Optional[str] = None
    target_topics: Optional[List[str]] = Field(default_factory=list)
    question_count: int = Field(default=5, ge=1, le=25)
