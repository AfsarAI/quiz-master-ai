"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useExamStore } from "@/store/examStore";
import type { Quiz, Question } from "@quiz-master/shared-types";
import { VisualPalette } from "@/components/exam/VisualPalette";
import { TimerBanner } from "@/components/exam/TimerBanner";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

export default function ExamTakePage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();

  const { user, token, initialize } = useAuthStore();
  const {
    quiz,
    attemptId,
    currentIndex,
    answers,
    markedForReview,
    isSubmitting,
    initExam,
    setCurrentIndex,
    selectOption,
    setTextAnswer,
    toggleReview,
    clearAnswer,
    setSubmitting,
    getFormattedAnswersForSubmission,
  } = useExamStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPreExamModal, setShowPreExamModal] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load quiz details
  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      router.push("/login");
      return;
    }

    const loadQuizData = async () => {
      try {
        setIsLoading(true);
        // Note: as per security specs, /quizzes/{id} strips is_correct for students
        const qData = await api.getQuiz(quizId, "exam");
        // Check if there is an in-progress draft in localStorage
        const existingDraft = localStorage.getItem(`exam_active_${quizId}`);
        if (existingDraft) {
          setHasExistingSession(true);
        }
        setIsLoading(false);
      } catch (err: any) {
        setLoadError(err.message || "Failed to load examination.");
        setIsLoading(false);
      }
    };

    if (token && quizId) {
      loadQuizData();
    }
  }, [quizId, token, router]);

  // Start or Resume Exam
  const handleStartExam = async () => {
    try {
      setIsLoading(true);
      const attemptResp = await api.startAttempt(quizId);
      const qData = await api.getQuiz(quizId, "exam");

      initExam(attemptResp.attempt_id, qData, attemptResp.expires_at);
      localStorage.setItem(`exam_active_${quizId}`, attemptResp.attempt_id);

      setShowPreExamModal(false);
      setExamStarted(true);
      setIsLoading(false);
    } catch (err: any) {
      setLoadError(err.message || "Failed to initialize exam session.");
      setIsLoading(false);
    }
  };

  // Submit Exam to server
  const handleSubmitExam = async () => {
    if (!attemptId || isSubmitting) return;

    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const formattedAnswers = getFormattedAnswersForSubmission();
      const evalResp = await api.submitAttempt(attemptId, {
        answers: formattedAnswers,
      });

      // Clear local exam active key
      localStorage.removeItem(`exam_active_${quizId}`);
      localStorage.removeItem(`exam_draft_${attemptId}`);

      // Route to results using canonical returned attempt ID
      const canonicalAttemptId = evalResp.attempt_id || attemptId;
      router.push(`/quiz/${quizId}/results?attemptId=${canonicalAttemptId}`);
    } catch (err: any) {
      alert(`Submission error: ${err.message || "Please check your network and try again."}`);
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Securing exam room & validating credentials...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-3xl border border-rose-500/30 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Examination Unavailable</h3>
        <p className="text-xs text-slate-400 mb-6">{loadError}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Pre-Exam Rules & Confirmation Modal
  if (showPreExamModal && !examStarted) {
    return (
      <div className="max-w-2xl mx-auto my-8 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-400">Assessment Portal</div>
            <h1 className="text-2xl font-extrabold text-white">Honor Code & Instructions</h1>
          </div>
        </div>

        <div className="space-y-4 mb-8 text-sm text-slate-300">
          <div className="glass-card p-4 rounded-xl border border-slate-800/80">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Examination Environment
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Deterministic and AI rubric evaluations occur on the server.</li>
              <li>Your responses are automatically backed up to local storage on every click.</li>
              <li>Once the timer expires, the server automatically seals the examination.</li>
              <li>Answer keys and citations will be revealed upon final submission.</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="glass-card p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Time Limit</span>
              <span className="font-bold text-white text-sm">15-20 Mins</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Integrity Mode</span>
              <span className="font-bold text-emerald-400 text-sm">Zero Exposure</span>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block mb-1">Auto-Save</span>
              <span className="font-bold text-cyan-400 text-sm">Enabled</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-800 pt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl glass-card text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cancel & Exit
          </button>
          <button
            onClick={handleStartExam}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2"
          >
            {hasExistingSession ? <RotateCcw className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{hasExistingSession ? "Resume In-Progress Assessment" : "Begin Examination"}</span>
          </button>
        </div>
      </div>
    );
  }

  const questions = quiz?.questions || [];
  if (!quiz || questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        No questions found for this assessment.
      </div>
    );
  }

  const currentQ: Question = questions[currentIndex];
  const currentDraft = answers[currentQ.id] || {
    question_id: currentQ.id,
    selected_option_ids: [],
    text_response: "",
  };
  const isReviewed = markedForReview.has(currentQ.id);

  // Calculate summary counts for submission confirmation
  let answeredCount = 0;
  questions.forEach((q) => {
    const a = answers[q.id];
    if (a && (a.selected_option_ids.length > 0 || (a.text_response && a.text_response.trim().length > 0))) {
      answeredCount++;
    }
  });
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Floating Status Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            {quiz.subject} • {quiz.difficulty}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate max-w-xl">{quiz.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <TimerBanner onTimeExpired={handleSubmitExam} />
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald flex items-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Main Examination Grid: Question View + Side Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Question Card (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex-1 flex flex-col justify-between">
            {/* Question Meta Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-6">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Question {currentIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {currentQ.points} {currentQ.points === 1 ? "Point" : "Points"}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                    {currentQ.question_type.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed mb-6">
                {currentQ.question_text}
              </h2>

              {/* Options / Text Input */}
              {currentQ.question_type === "short_answer" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Written Answer (AI Rubric Graded):
                  </label>
                  <textarea
                    rows={6}
                    value={currentDraft.text_response || ""}
                    onChange={(e) => setTextAnswer(currentQ.id, e.target.value)}
                    placeholder="Enter your detailed explanation here..."
                    className="w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <div className="text-right text-[11px] text-slate-500">
                    {currentDraft.text_response?.length || 0} characters
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = currentDraft.selected_option_ids.includes(opt.id);
                    const letterLabel = String.fromCharCode(65 + optIdx);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectOption(currentQ.id, opt.id, currentQ.question_type)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-glow"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {letterLabel}
                        </div>
                        <span className="text-sm font-medium leading-relaxed">{opt.option_text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="border-t border-slate-800/80 pt-6 mt-8 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleReview(currentQ.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isReviewed
                      ? "bg-purple-600 text-white shadow-glow-purple"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isReviewed ? "Marked for Review" : "Mark for Review"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => clearAnswer(currentQ.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm flex items-center gap-1 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visual Question Palette (4 cols) */}
        <div className="lg:col-span-4">
          <VisualPalette />
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2">Ready to Submit Examination?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Your responses will be graded securely on the server. Answer keys and citation details will be provided immediately.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-xs text-emerald-300 block mb-1">Answered</span>
                <span className="text-xl font-black text-emerald-400">{answeredCount}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                <span className="text-xs text-rose-300 block mb-1">Unanswered</span>
                <span className="text-xl font-black text-rose-400">{unansweredCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-slate-300 hover:text-white"
              >
                Return to Exam
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitExam}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-emerald flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? "Evaluating on Server..." : "Confirm Submission"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
