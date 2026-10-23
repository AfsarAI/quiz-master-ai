import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), index=True, nullable=False)
    grade_level = Column(String(50), nullable=True)
    difficulty = Column(String(50), default="medium", nullable=False)
    duration_minutes = Column(Integer, default=15, nullable=False)
    pass_percentage = Column(Float, default=60.0, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    generation_params = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="quizzes")
    document = relationship("Document", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order_index")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_id = Column(String(36), ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True)
    question_type = Column(String(50), nullable=False)  # 'single_choice', 'multi_choice', 'true_false', 'short_answer'
    question_text = Column(Text, nullable=False)
    points = Column(Float, default=1.0, nullable=False)
    order_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    citation_quote = Column(Text, nullable=True)
    rubric_criteria = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    chunk = relationship("DocumentChunk", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.option_order")
    attempt_answers = relationship("AttemptAnswer", back_populates="question")

class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)  # Never exposed to test-takers before submission
    option_order = Column(Integer, nullable=False)

    # Relationships
    question = relationship("Question", back_populates="options")
