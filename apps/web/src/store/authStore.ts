import { create } from "zustand";
import type { User } from "@quiz-master/shared-types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: (user: User, token: string) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quizmaster_token", token);
        localStorage.setItem("quizmaster_user", JSON.stringify(user));
      } catch (e) {
        console.error("Failed to persist auth to localStorage", e);
      }
    }
    set({ user, token, isLoading: false });
  },
  setUser: (user: User) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("quizmaster_user", JSON.stringify(user));
      } catch (e) {}
    }
    set({ user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("quizmaster_token");
      localStorage.removeItem("quizmaster_user");
    }
    set({ user: null, token: null, isLoading: false });
  },
  initialize: () => {
    const current = get();
    if (current.token && current.user && !current.isLoading) {
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("quizmaster_token");
        const userStr = localStorage.getItem("quizmaster_user");
        if (token && userStr) {
          const user = JSON.parse(userStr);
          set({ user, token, isLoading: false });
          return;
        }
      } catch (e) {
        localStorage.removeItem("quizmaster_token");
        localStorage.removeItem("quizmaster_user");
      }
    }
    set({ user: null, token: null, isLoading: false });
  },
}));
