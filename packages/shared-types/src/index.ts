/**
 * Quiz-Master-AI Shared TypeScript Type Definitions
 */

// User & Authentication Roles
export type UserRole = 'student' | 'educator' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: 'student' | 'educator';
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Document Management
export type DocumentStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_key: string;
  file_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  error_message?: string | null;
  metadata_json: Record<string, any>;
  page_count: number;
  chunk_count: number;
  created_at: string;
}

export interface DocumentStatusResponse {
  document_id: string;
  status: DocumentStatus;
  title: string;
  page_count: number;
  chunk_count: number;
  extracted_topics: string[];
  error_message?: string | null;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number | null;
  section_heading?: string | null;
  token_count: number;
  created_at: string;
}

// Quiz & Question Definitions
export type QuestionType = 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer';
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean; // Stripped for active student view
  option_order: number;
}

export interface Question {
  id: string;
  quiz_id: string;
  chunk_id?: string | null;
  question_type: QuestionType;
  question_text: string;
  points: number;
  order_index: number;
  options: QuestionOption[];
  explanation?: string; // Stripped for active student view
  citation_quote?: string | null;
  rubric_criteria?: Record<string, any> | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  creator_id: string;
  document_id?: string | null;
  title: string;
  description?: string | null;
  subject: string;
  grade_level?: string | null;
  difficulty: QuizDifficulty;
  duration_minutes: number;
  pass_percentage: number;
  is_published: boolean;
  total_questions?: number;
  questions?: Question[];
  created_at: string;
}

export interface QuizGenerateRequest {
  document_id: string;
  title: string;
  grade_level?: string;
  subject?: string;
  topic_focus?: string[];
  difficulty?: QuizDifficulty;
  question_count: number;
  duration_minutes?: number;
  question_types?: QuestionType[];
}

export interface QuizGenerateResponse {
  quiz_id: string;
  task_id?: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  message: string;
}

// Examination & Submissions
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'TIMED_OUT';

export interface StartAttemptRequest {
  quiz_id: string;
}

export interface StartAttemptResponse {
  attempt_id: string;
  quiz_id: string;
  started_at: string;
  duration_minutes: number;
  expires_at: string;
}

export interface StudentAnswerItem {
  question_id: string;
  selected_option_ids: string[];
  text_response?: string | null;
}

export interface SubmitAttemptRequest {
  answers: StudentAnswerItem[];
}

export interface CitationInfo {
  source_document?: string;
  page_number?: number | null;
  section_heading?: string | null;
  quote?: string | null;
}

export interface QuestionReviewItem {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  student_selection: string[];
  student_text_response?: string | null;
  correct_options: string[];
  is_correct: boolean;
  marks_awarded: number;
  max_marks: number;
  explanation: string;
  citation?: CitationInfo | null;
  ai_feedback?: string | null;
  key_points_missed?: string[];
}

export interface EvaluatedAttemptResponse {
  attempt_id: string;
  quiz_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  is_passed: boolean;
  time_spent_seconds: number;
  status: AttemptStatus;
  question_reviews: QuestionReviewItem[];
  weak_areas_detected: string[];
  next_recommended_practice?: string;
}

// User Weak Areas & Diagnostic Analytics
export interface UserWeakArea {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  failure_count: number;
  mastery_score: number; // 0.0 to 1.0
  last_attempted_at: string;
}

export interface AnalyticsSummary {
  total_quizzes_taken: number;
  average_score_percentage: number;
  total_study_time_minutes: number;
  mastery_by_subject: Record<string, number>;
  weak_areas: UserWeakArea[];
  recent_attempts: {
    attempt_id: string;
    quiz_title: string;
    percentage: number;
    submitted_at: string;
  }[];
}
