"""Initial schema with pgvector, users, documents, quizzes, attempts, and analytics

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-23 09:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from app.models.types import FlexibleVector

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Enable pgvector extension if PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='student', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('file_key', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='QUEUED', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('page_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('chunk_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_documents_user_id', 'documents', ['user_id'])

    # 3. document_chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('document_id', sa.String(length=36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('section_heading', sa.String(length=255), nullable=True),
        sa.Column('token_count', sa.Integer(), nullable=False),
        sa.Column('embedding', FlexibleVector(1536), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])

    # 4. quizzes
    op.create_table(
        'quizzes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('creator_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.String(length=36), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subject', sa.String(length=100), nullable=False),
        sa.Column('grade_level', sa.String(length=50), nullable=True),
        sa.Column('difficulty', sa.String(length=50), server_default='medium', nullable=False),
        sa.Column('duration_minutes', sa.Integer(), server_default='15', nullable=False),
        sa.Column('pass_percentage', sa.Float(), server_default='60.0', nullable=False),
        sa.Column('is_published', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('generation_params', sa.JSON(), server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_quizzes_creator_id', 'quizzes', ['creator_id'])
    op.create_index('ix_quizzes_subject', 'quizzes', ['subject'])

    # 5. questions
    op.create_table(
        'questions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('quiz_id', sa.String(length=36), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_id', sa.String(length=36), sa.ForeignKey('document_chunks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('question_type', sa.String(length=50), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('points', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('citation_quote', sa.Text(), nullable=True),
        sa.Column('rubric_criteria', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_questions_quiz_id', 'questions', ['quiz_id'])

    # 6. question_options
    op.create_table(
        'question_options',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('question_id', sa.String(length=36), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('option_text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('option_order', sa.Integer(), nullable=False),
    )
    op.create_index('ix_question_options_question_id', 'question_options', ['question_id'])

    # 7. quiz_attempts
    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('quiz_id', sa.String(length=36), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='IN_PROGRESS', nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_spent_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('percentage', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('is_passed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_quiz_attempts_quiz_id', 'quiz_attempts', ['quiz_id'])
    op.create_index('ix_quiz_attempts_user_id', 'quiz_attempts', ['user_id'])

    # 8. attempt_answers
    op.create_table(
        'attempt_answers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('attempt_id', sa.String(length=36), sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', sa.String(length=36), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('selected_option_ids', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('text_response', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('marks_awarded', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('ai_feedback', sa.Text(), nullable=True),
        sa.Column('key_points_missed', sa.JSON(), server_default='[]', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_attempt_answers_attempt_id', 'attempt_answers', ['attempt_id'])
    op.create_index('ix_attempt_answers_question_id', 'attempt_answers', ['question_id'])

    # 9. user_weak_areas
    op.create_table(
        'user_weak_areas',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject', sa.String(length=100), nullable=False),
        sa.Column('topic', sa.String(length=150), nullable=False),
        sa.Column('failure_count', sa.Integer(), server_default='1', nullable=False),
        sa.Column('mastery_score', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('last_attempted_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_user_weak_areas_user_id', 'user_weak_areas', ['user_id'])


def downgrade() -> None:
    op.drop_table('user_weak_areas')
    op.drop_table('attempt_answers')
    op.drop_table('quiz_attempts')
    op.drop_table('question_options')
    op.drop_table('questions')
    op.drop_table('quizzes')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.drop_table('users')
