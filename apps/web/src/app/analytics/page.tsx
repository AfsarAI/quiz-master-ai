"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { AnalyticsSummary, UserWeakArea } from "@quiz-master/shared-types";
import {
  BarChart3,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Play,
  Loader2,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const { token, initialize } = useAuthStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [weakAreas, setWeakAreas] = useState<UserWeakArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAdaptive, setIsGeneratingAdaptive] = useState(false);
  const [targetSubject, setTargetSubject] = useState<string>("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      router.push("/login");
      return;
    }

    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const [sum, wa] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getWeakAreas(),
        ]);
        setSummary(sum);
        setWeakAreas(wa);
        if (wa.length > 0) {
          setTargetSubject(wa[0].subject);
        }
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadAnalytics();
    }
  }, [token, router]);

  const handleGenerateAdaptiveQuiz = async (subjectToUse?: string) => {
    setIsGeneratingAdaptive(true);
    try {
      const resp = await api.generateAdaptiveQuiz(subjectToUse || targetSubject, 5);
      router.push(`/quiz/${resp.quiz_id}/take`);
    } catch (err: any) {
      alert(`Adaptive quiz generation failed: ${err.message || "Please try again."}`);
      setIsGeneratingAdaptive(false);
    }
  };

  const getMasteryColor = (score: number) => {
    if (score >= 0.75) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 0.45) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  };

  const getBarColor = (score: number) => {
    if (score >= 0.75) return "bg-emerald-500";
    if (score >= 0.45) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Aggregating conceptual performance telemetry...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Top Banner with 1-Click Adaptive Launcher */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Targeted Remediation Loop</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Diagnostic Weakness Heatmap</h1>
          <p className="text-sm text-slate-400 mt-1">
            Quiz-Master-AI maps your conceptual blind spots from missed questions and automatically formulates personalized practice sets.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <button
            onClick={() => handleGenerateAdaptiveQuiz()}
            disabled={isGeneratingAdaptive || weakAreas.length === 0}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all hover:scale-102 disabled:opacity-50"
          >
            {isGeneratingAdaptive ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Formulating Practice Quiz...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>1-Click Adaptive Practice Quiz</span>
              </>
            )}
          </button>
          {weakAreas.length > 0 && (
            <span className="text-[11px] text-slate-500 text-center">
              Targeting {weakAreas.length} flagged concept{weakAreas.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
            Mastery by Subject
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.mastery_by_subject ? Object.keys(summary.mastery_by_subject).length : 0} Subjects
          </div>
          <div className="text-xs text-slate-500 mt-1">Evaluated across all test sessions</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
            Overall Accuracy
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {summary?.average_score_percentage ? `${summary.average_score_percentage}%` : "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">Mean examination percentage</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
            Flagged Weak Points
          </div>
          <div className="text-2xl font-black text-rose-400">{weakAreas.length} Topics</div>
          <div className="text-xs text-slate-500 mt-1">Requiring targeted review</div>
        </div>
      </div>

      {/* Weak Areas Concept Matrix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Conceptual Mastery Breakdown</h2>
            <p className="text-xs text-slate-400">Topics needing targeted review based on your question error rates</p>
          </div>
        </div>

        {weakAreas.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Conceptual Weaknesses Detected!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              You haven't accumulated persistent errors across any topics yet. Take more assessments to track mastery metrics.
            </p>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-glow"
            >
              Browse Assessments
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakAreas.map((wa) => {
              const masteryPercent = Math.round(wa.mastery_score * 100);
              const badgeStyle = getMasteryColor(wa.mastery_score);
              const barColor = getBarColor(wa.mastery_score);

              return (
                <div
                  key={wa.id}
                  className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        {wa.subject}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {masteryPercent}% Mastery
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white mb-2 line-clamp-1">{wa.topic}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-4 mb-4">
                      <span>{wa.failure_count} question error{wa.failure_count > 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>
                        Last attempted: {new Date(wa.last_attempted_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 mb-4">
                      <div
                        className={`h-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.max(5, masteryPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Targeted practice recommended</span>
                    <button
                      type="button"
                      onClick={() => handleGenerateAdaptiveQuiz(wa.subject)}
                      disabled={isGeneratingAdaptive}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Practice Topic</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
