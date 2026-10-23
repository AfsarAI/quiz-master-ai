"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { EvaluatedAttemptResponse, QuestionReviewItem } from "@quiz-master/shared-types";
import { CitationCard } from "@/components/exam/CitationCard";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Loader2,
  Check,
  X,
} from "lucide-react";

function ExamResultsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = params.id as string;
  const attemptId = searchParams.get("attemptId");
  const router = useRouter();

  const { token, initialize } = useAuthStore();
  const [result, setResult] = useState<EvaluatedAttemptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      router.push("/login");
      return;
    }

    const loadResult = async () => {
      if (!attemptId) {
        setError("Attempt ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.getAttemptResult(attemptId);
        setResult(data);

        // Confetti if student passed!
        if (data.is_passed) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ["#6366f1", "#10b981", "#8b5cf6", "#38bdf8"],
            });
          } catch (e) {
            // Ignore if canvas is unavailable
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load examination results.");
      } finally {
        setIsLoading(false);
      }
    };

    if (token && attemptId) {
      loadResult();
    }
  }, [quizId, attemptId, token, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Compiling score card & citation references...</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-3xl border border-rose-500/30 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Result Card Error</h3>
        <p className="text-xs text-slate-400 mb-6">{error || "Result not found."}</p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const minutesSpent = Math.floor(result.time_spent_seconds / 60);
  const secondsSpent = result.time_spent_seconds % 60;
  const timeFormatted = `${minutesSpent}m ${secondsSpent}s`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Score Summary Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            result.is_passed ? "bg-emerald-500/10" : "bg-rose-500/10"
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  result.is_passed
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-glow-emerald"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {result.is_passed ? "PASSED ASSESSMENT" : "NEEDS PRACTICE"}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {timeFormatted}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Assessment Scorecard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Grounded psychometric review with deterministic and rubric-evaluated criteria.
            </p>
          </div>

          {/* Large Circular/Pill Score Badge */}
          <div className="flex items-center gap-6 self-start md:self-center">
            <div className="text-right">
              <div className="text-4xl sm:text-5xl font-black text-white">{result.percentage}%</div>
              <div className="text-xs text-slate-400 font-semibold mt-1">
                {result.total_score} / {result.max_score} Marks Awarded
              </div>
            </div>
          </div>
        </div>

        {/* Next Recommendation / Remediation Banner */}
        {result.next_recommended_practice && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/20">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-indigo-300 block">AI Recommended Next Step:</span>
                <span className="text-xs text-slate-300">{result.next_recommended_practice}</span>
              </div>
            </div>
            <Link
              href="/analytics"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5 shadow-sm"
            >
              <span>Remediation Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Question by Question Detailed Review */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Detailed Question Reviews</h2>
          <span className="text-xs text-slate-400">{result.question_reviews.length} Evaluated Responses</span>
        </div>

        {result.question_reviews.map((rev, idx) => {
          return (
            <div
              key={rev.question_id}
              className={`glass-panel p-6 rounded-3xl border transition-all ${
                rev.is_correct
                  ? "border-emerald-500/30 bg-emerald-950/10"
                  : "border-rose-500/30 bg-rose-950/10"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Q{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      rev.is_correct
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {rev.is_correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{rev.is_correct ? "Correct" : "Incorrect"}</span>
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-300">
                  {rev.marks_awarded} / {rev.max_marks} Points
                </div>
              </div>

              {/* Question Text */}
              <h3 className="font-bold text-base text-white mb-4 leading-relaxed">{rev.question_text}</h3>

              {/* Subjective vs Objective review view */}
              {rev.question_type === "short_answer" ? (
                <div className="space-y-3 mb-4">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 block uppercase tracking-wider font-semibold mb-1">
                      Your Response:
                    </span>
                    <span className="text-slate-200 whitespace-pre-wrap">
                      {rev.student_text_response || "No response provided."}
                    </span>
                  </div>

                  {rev.ai_feedback && (
                    <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs">
                      <span className="text-indigo-400 block uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        AI Rubric Evaluation:
                      </span>
                      <span className="text-slate-300">{rev.ai_feedback}</span>
                    </div>
                  )}

                  {rev.key_points_missed && rev.key_points_missed.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-xs">
                      <span className="text-rose-400 block uppercase tracking-wider font-semibold mb-1">
                        Key Points Missed:
                      </span>
                      <ul className="list-disc list-inside text-rose-300 space-y-1">
                        {rev.key_points_missed.map((kp, kIdx) => (
                          <li key={kIdx}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>
                      <strong className="text-slate-300">Your Selection:</strong>{" "}
                      {rev.student_selection.length > 0 ? (
                        <span className={rev.is_correct ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                          {rev.student_selection.join(", ")}
                        </span>
                      ) : (
                        <span className="text-rose-400 italic">None selected</span>
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-300">Correct Option(s):</strong>{" "}
                      <span className="text-emerald-400 font-bold">{rev.correct_options.join(", ")}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Grounded Explanation */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                <span className="text-indigo-400 font-bold uppercase tracking-wider block mb-1">
                  Psychometric Rationale:
                </span>
                <p className="leading-relaxed">{rev.explanation}</p>
              </div>

              {/* Exact Source Document Citation Popover / Box */}
              <CitationCard citation={rev.citation} />
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl glass-card text-xs font-semibold text-slate-300 hover:text-white"
        >
          Return to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/quiz/${quizId}/take`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-card text-xs font-semibold text-indigo-300 hover:text-indigo-200 border border-indigo-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Assessment</span>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-glow"
          >
            <span>View Weak-Area Remediation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ExamResultsPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400 py-12">Loading scorecard...</div>}>
      <ExamResultsContent />
    </Suspense>
  );
}
