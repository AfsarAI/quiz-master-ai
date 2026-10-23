import type {
  User,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Quiz,
  StartAttemptResponse,
  SubmitAttemptRequest,
  EvaluatedAttemptResponse,
  Document,
  AnalyticsSummary,
} from "@quiz-master/shared-types";

// For local Android emulator, 10.0.2.2 maps to host localhost. On iOS simulator or web, localhost works.
const API_BASE = "http://10.0.2.2:8000/api/v1";

class MobileApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err.detail || err.message || msg;
      } catch (e) {
        const text = await res.text();
        if (text) msg = text;
      }
      throw new Error(msg);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async listQuizzes(): Promise<Quiz[]> {
    return this.request<Quiz[]>("/quizzes/");
  }

  async getQuiz(id: string): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${id}?mode=exam`);
  }

  async startAttempt(quizId: string): Promise<StartAttemptResponse> {
    return this.request<StartAttemptResponse>("/attempts/start", {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId }),
    });
  }

  async submitAttempt(attemptId: string, submission: SubmitAttemptRequest): Promise<EvaluatedAttemptResponse> {
    return this.request<EvaluatedAttemptResponse>(`/attempts/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify(submission),
    });
  }

  async getAttemptResult(attemptId: string): Promise<EvaluatedAttemptResponse> {
    return this.request<EvaluatedAttemptResponse>(`/attempts/${attemptId}/result`);
  }

  async listDocuments(): Promise<Document[]> {
    return this.request<Document[]>("/documents/");
  }

  async getAnalytics(): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>("/analytics/summary");
  }
}

export const mobileApi = new MobileApiClient();
