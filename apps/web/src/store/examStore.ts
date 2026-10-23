import { create } from "zustand";
import type { Quiz, Question, QuestionType } from "@quiz-master/shared-types";

export type QuestionStatus = "not_visited" | "current" | "answered" | "not_answered" | "review";

export interface StudentDraftAnswer {
  question_id: string;
  selected_option_ids: string[];
  text_response: string;
}

interface ExamState {
  attemptId: string | null;
  quiz: Quiz | null;
  currentIndex: number;
  visitedQuestions: Set<string>;
  markedForReview: Set<string>;
  answers: Record<string, StudentDraftAnswer>;
  expiresAt: string | null;
  secondsRemaining: number;
  isSubmitting: boolean;

  // Actions
  initExam: (attemptId: string, quiz: Quiz, expiresAt: string) => void;
  setCurrentIndex: (index: number) => void;
  selectOption: (questionId: string, optionId: string, questionType: QuestionType) => void;
  setTextAnswer: (questionId: string, text: string) => void;
  toggleReview: (questionId: string) => void;
  clearAnswer: (questionId: string) => void;
  decrementTimer: () => void;
  setSubmitting: (val: boolean) => void;
  getQuestionStatus: (questionId: string, index: number) => QuestionStatus;
  getFormattedAnswersForSubmission: () => Array<{ question_id: string; selected_option_ids: string[]; text_response: string | null }>;
  resetExam: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  attemptId: null,
  quiz: null,
  currentIndex: 0,
  visitedQuestions: new Set(),
  markedForReview: new Set(),
  answers: {},
  expiresAt: null,
  secondsRemaining: 0,
  isSubmitting: false,

  initExam: (attemptId: string, quiz: Quiz, expiresAt: string) => {
    // Check localStorage for saved draft progress
    let savedAnswers: Record<string, StudentDraftAnswer> = {};
    let savedVisited = new Set<string>();
    let savedReview = new Set<string>();

    if (typeof window !== "undefined") {
      const draftStr = localStorage.getItem(`exam_draft_${attemptId}`);
      if (draftStr) {
        try {
          const parsed = JSON.parse(draftStr);
          savedAnswers = parsed.answers || {};
          savedVisited = new Set(parsed.visited || []);
          savedReview = new Set(parsed.review || []);
        } catch (e) {
          console.error("Failed to parse saved draft", e);
        }
      }
    }

    // First question is automatically visited
    const questions = quiz.questions || [];
    if (questions.length > 0) {
      savedVisited.add(questions[0].id);
    }

    const expiryTime = new Date(expiresAt).getTime();
    const nowTime = Date.now();
    const remaining = Math.max(0, Math.floor((expiryTime - nowTime) / 1000));

    set({
      attemptId,
      quiz,
      currentIndex: 0,
      visitedQuestions: savedVisited,
      markedForReview: savedReview,
      answers: savedAnswers,
      expiresAt,
      secondsRemaining: remaining,
      isSubmitting: false,
    });
  },

  setCurrentIndex: (index: number) => {
    const { quiz, visitedQuestions, attemptId, markedForReview, answers } = get();
    const questions = quiz?.questions || [];
    if (!quiz || index < 0 || index >= questions.length) return;

    const currentQ = questions[index];
    const newVisited = new Set(visitedQuestions);
    newVisited.add(currentQ.id);

    set({ currentIndex: index, visitedQuestions: newVisited });

    // Persist visited progress
    if (typeof window !== "undefined" && attemptId) {
      localStorage.setItem(
        `exam_draft_${attemptId}`,
        JSON.stringify({
          answers,
          visited: Array.from(newVisited),
          review: Array.from(markedForReview),
        })
      );
    }
  },

  selectOption: (questionId: string, optionId: string, questionType: QuestionType) => {
    const { answers, attemptId, visitedQuestions, markedForReview } = get();
    const existing = answers[questionId] || {
      question_id: questionId,
      selected_option_ids: [],
      text_response: "",
    };

    let newSelected: string[];
    if (questionType === "multi_choice") {
      if (existing.selected_option_ids.includes(optionId)) {
        newSelected = existing.selected_option_ids.filter((id) => id !== optionId);
      } else {
        newSelected = [...existing.selected_option_ids, optionId];
      }
    } else {
      // Single choice or True/False
      newSelected = [optionId];
    }

    const updatedAnswers = {
      ...answers,
      [questionId]: {
        ...existing,
        selected_option_ids: newSelected,
      },
    };

    set({ answers: updatedAnswers });

    // Sync to localStorage
    if (typeof window !== "undefined" && attemptId) {
      localStorage.setItem(
        `exam_draft_${attemptId}`,
        JSON.stringify({
          answers: updatedAnswers,
          visited: Array.from(visitedQuestions),
          review: Array.from(markedForReview),
        })
      );
    }
  },

  setTextAnswer: (questionId: string, text: string) => {
    const { answers, attemptId, visitedQuestions, markedForReview } = get();
    const existing = answers[questionId] || {
      question_id: questionId,
      selected_option_ids: [],
      text_response: "",
    };

    const updatedAnswers = {
      ...answers,
      [questionId]: {
        ...existing,
        text_response: text,
      },
    };

    set({ answers: updatedAnswers });

    if (typeof window !== "undefined" && attemptId) {
      localStorage.setItem(
        `exam_draft_${attemptId}`,
        JSON.stringify({
          answers: updatedAnswers,
          visited: Array.from(visitedQuestions),
          review: Array.from(markedForReview),
        })
      );
    }
  },

  toggleReview: (questionId: string) => {
    const { markedForReview, attemptId, answers, visitedQuestions } = get();
    const newReview = new Set(markedForReview);
    if (newReview.has(questionId)) {
      newReview.delete(questionId);
    } else {
      newReview.add(questionId);
    }

    set({ markedForReview: newReview });

    if (typeof window !== "undefined" && attemptId) {
      localStorage.setItem(
        `exam_draft_${attemptId}`,
        JSON.stringify({
          answers,
          visited: Array.from(visitedQuestions),
          review: Array.from(newReview),
        })
      );
    }
  },

  clearAnswer: (questionId: string) => {
    const { answers, attemptId, visitedQuestions, markedForReview } = get();
    const updatedAnswers = { ...answers };
    delete updatedAnswers[questionId];

    set({ answers: updatedAnswers });

    if (typeof window !== "undefined" && attemptId) {
      localStorage.setItem(
        `exam_draft_${attemptId}`,
        JSON.stringify({
          answers: updatedAnswers,
          visited: Array.from(visitedQuestions),
          review: Array.from(markedForReview),
        })
      );
    }
  },

  decrementTimer: () => {
    const { secondsRemaining } = get();
    if (secondsRemaining > 0) {
      set({ secondsRemaining: secondsRemaining - 1 });
    }
  },

  setSubmitting: (val: boolean) => set({ isSubmitting: val }),

  getQuestionStatus: (questionId: string, index: number): QuestionStatus => {
    const { currentIndex, markedForReview, answers, visitedQuestions } = get();

    if (markedForReview.has(questionId)) {
      return "review";
    }

    if (currentIndex === index) {
      return "current";
    }

    const ans = answers[questionId];
    const hasAnswer = ans && (ans.selected_option_ids.length > 0 || (ans.text_response && ans.text_response.trim().length > 0));

    if (hasAnswer) {
      return "answered";
    }

    if (visitedQuestions.has(questionId)) {
      return "not_answered";
    }

    return "not_visited";
  },

  getFormattedAnswersForSubmission: () => {
    const { quiz, answers } = get();
    if (!quiz) return [];
    const questions = quiz.questions || [];

    return questions.map((q) => {
      const a = answers[q.id];
      return {
        question_id: q.id,
        selected_option_ids: a ? a.selected_option_ids : [],
        text_response: a && a.text_response ? a.text_response : null,
      };
    });
  },

  resetExam: () => {
    set({
      attemptId: null,
      quiz: null,
      currentIndex: 0,
      visitedQuestions: new Set(),
      markedForReview: new Set(),
      answers: {},
      expiresAt: null,
      secondsRemaining: 0,
      isSubmitting: false,
    });
  },
}));
