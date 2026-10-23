import type {
  User,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Document,
  DocumentStatusResponse,
  Quiz,
  QuizGenerateRequest,
  StartAttemptResponse,
  SubmitAttemptRequest,
  EvaluatedAttemptResponse,
  UserWeakArea,
  AnalyticsSummary,
} from "@quiz-master/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("quizmaster_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && typeof window !== "undefined") {
      if (!endpoint.includes("/auth/login") && token) {
        if (!window.location.pathname.includes("/login")) {
          localStorage.removeItem("quizmaster_token");
          localStorage.removeItem("quizmaster_user");
          window.location.href = "/login";
        }
      }
    }

    if (!res.ok) {
      let errorMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch (e) {
        // Fallback to text
        const text = await res.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    // 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // Auth Endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Document Endpoints
  async uploadDocument(file: File, title?: string): Promise<{ document_id: string; title: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    return this.request<{ document_id: string; title: string; status: string }>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    return this.request<DocumentStatusResponse>(`/documents/${documentId}/status`);
  }

  async listDocuments(): Promise<Document[]> {
    return this.request<Document[]>("/documents");
  }

  // Quiz Endpoints
  async generateQuiz(params: QuizGenerateRequest): Promise<{ quiz_id: string; status: string; message: string }> {
    return this.request<{ quiz_id: string; status: string; message: string }>("/quizzes/generate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async listQuizzes(): Promise<Quiz[]> {
    return this.request<Quiz[]>("/quizzes");
  }

  async getQuiz(quizId: string, mode: "exam" | "view" = "exam"): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${quizId}?mode=${mode}`);
  }

  // Exam Attempt Endpoints
  async startAttempt(quizId: string): Promise<StartAttemptResponse> {
    return this.request<StartAttemptResponse>("/attempts/start", {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId }),
    });
  }

  async submitAttempt(attemptId: string, submission: SubmitAttemptRequest): Promise<EvaluatedAttemptResponse> {
    const cleanAttemptId = encodeURIComponent(attemptId.trim());
    return this.request<EvaluatedAttemptResponse>(`/attempts/${cleanAttemptId}/submit`, {
      method: "POST",
      body: JSON.stringify(submission),
    });
  }

  async getAttemptResult(attemptId: string, quizId?: string): Promise<EvaluatedAttemptResponse> {
    const cleanAttemptId = encodeURIComponent(attemptId.trim());
    const query = quizId ? `?quiz_id=${encodeURIComponent(quizId.trim())}` : "";
    try {
      return await this.request<EvaluatedAttemptResponse>(`/attempts/${cleanAttemptId}/result${query}`);
    } catch (err: any) {
      // Graceful fallback to root attempt endpoint if /result is unavailable
      if (err.message && err.message.includes("404")) {
        return await this.request<EvaluatedAttemptResponse>(`/attempts/${cleanAttemptId}${query}`);
      }
      throw err;
    }
  }

  // Analytics & Remediation Endpoints
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>("/analytics/summary");
  }

  async getWeakAreas(): Promise<UserWeakArea[]> {
    return this.request<UserWeakArea[]>("/analytics/weak-areas");
  }

  async generateAdaptiveQuiz(subject?: string, questionCount: number = 5): Promise<{ quiz_id: string; title: string }> {
    return this.request<{ quiz_id: string; title: string }>("/analytics/adaptive-quiz", {
      method: "POST",
      body: JSON.stringify({ subject, question_count: questionCount }),
    });
  }
}

export const api = new ApiClient();
