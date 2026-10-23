"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Quiz, AnalyticsSummary, Document } from "@quiz-master/shared-types";
import {
  Sparkles,
  BookOpen,
  Award,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  PlusCircle,
  FileText,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!token && typeof window !== "undefined") {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [quizList, docList, summary] = await Promise.allSettled([
          api.listQuizzes(),
          api.listDocuments(),
          api.getAnalyticsSummary(),
        ]);

        if (quizList.status === "fulfilled") setQuizzes(quizList.value);
        if (docList.status === "fulfilled") setDocuments(docList.value);
        if (summary.status === "fulfilled") setAnalytics(summary.value);
      } catch (e) {
        console.error("Dashboard data load error", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, router]);

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "hard":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "adaptive":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "medium":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-sm text-slate-400">Loading your workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Psychometric Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Hello, {user?.full_name || "Scholar"}!
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Create AI quizzes directly grounded in your class notes, or take an assessment below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            href="/documents"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-slate-200 text-sm font-semibold border border-slate-700/80 hover:text-white"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Ingest Document</span>
          </Link>
          <Link
            href="/quiz/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-glow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Quiz</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessments Taken</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">{analytics?.total_quizzes_taken || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Verified examination attempts</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {analytics?.average_score_percentage ? `${analytics.average_score_percentage}%` : "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all completed assessments</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingested Material</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">{documents.length}</div>
          <div className="text-xs text-slate-500 mt-1">Vectorized documents in library</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weak Areas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {analytics?.weak_areas?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <Link href="/analytics" className="text-indigo-400 hover:underline">
              View remediation list →
            </Link>
          </div>
        </div>
      </div>

      {/* Available Quizzes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Available Assessments</h2>
            <p className="text-xs text-slate-400">Select a quiz to enter the secure examination portal</p>
          </div>
          <Link
            href="/quiz/create"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Create Another Quiz <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl border border-dashed border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Quizzes Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Upload a course document (PDF or DOCX), and Quiz-Master-AI will generate grounded questions automatically.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/documents"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-glow"
              >
                Upload First Document
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="glass-card p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      {q.subject}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyBadge(
                        q.difficulty
                      )}`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white mb-2 line-clamp-1">{q.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {q.description || "Grounded assessment generated from uploaded course material."}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {q.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      {q.total_questions} Questions
                    </span>
                  </div>

                  <Link
                    href={`/quiz/${q.id}/take`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Take Exam</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
