"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Document, QuestionType, QuizDifficulty } from "@quiz-master/shared-types";
import {
  Sparkles,
  BookOpen,
  Sliders,
  Layers,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Check,
  Tag,
} from "lucide-react";

function QuizCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDocId = searchParams.get("docId");

  const { token, isLoading: authLoading, initialize } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState(preselectedDocId || "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Undergraduate");
  const [topicFocusInput, setTopicFocusInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "single_choice",
    "true_false",
    "short_answer",
  ]);

  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (authLoading) return;

    if (!token && typeof window !== "undefined") {
      router.replace("/login");
      return;
    }

    const loadDocs = async () => {
      try {
        const docs = await api.listDocuments();
        const readyDocs = docs.filter((d) => d.status === "READY");
        setDocuments(readyDocs);
        if (preselectedDocId && readyDocs.some((d) => d.id === preselectedDocId)) {
          setSelectedDocId(preselectedDocId);
          const found = readyDocs.find((d) => d.id === preselectedDocId);
          if (found) {
            setTitle(`${found.title} Assessment`);
            setSubject(found.metadata_json?.subject || "General Study");
          }
        } else if (readyDocs.length > 0 && !selectedDocId) {
          setSelectedDocId(readyDocs[0].id);
          setTitle(`${readyDocs[0].title} Assessment`);
          setSubject("Computer Science");
        }
      } catch (e) {
        console.error("Error loading documents", e);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    if (token) {
      loadDocs();
    }
  }, [token, preselectedDocId, router, selectedDocId]);

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    const found = documents.find((d) => d.id === docId);
    if (found) {
      setTitle(`${found.title} Assessment`);
    }
  };

  const handleAddTopic = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && topicFocusInput.trim()) {
      e.preventDefault();
      const clean = topicFocusInput.trim();
      if (!topics.includes(clean)) {
        setTopics([...topics, clean]);
      }
      setTopicFocusInput("");
    }
  };

  const removeTopic = (t: string) => {
    setTopics(topics.filter((item) => item !== t));
  };

  const toggleType = (t: QuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((type) => type !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setError("Please select or upload a ready source document.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await api.generateQuiz({
        document_id: selectedDocId,
        title: title || "Grounded Course Assessment",
        subject: subject || "General",
        grade_level: gradeLevel,
        difficulty,
        question_count: Number(questionCount),
        duration_minutes: Number(durationMinutes),
        question_types: selectedTypes,
        topic_focus: topics.length > 0 ? topics : undefined,
      });

      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Psychometric Test Author</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">AI Quiz Configurator</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure test parameters. The LLM strictly generates questions cited from your selected document chunks.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        {/* Source Document Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            1. Source Educational Material
          </label>
          {isLoadingDocs ? (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Loading available documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-300">
              No ready documents found. Please upload a PDF or DOCX in the Document Ingestion Hub first.
            </div>
          ) : (
            <select
              value={selectedDocId}
              onChange={(e) => handleDocChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.page_count} pages • {d.chunk_count} chunks)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Title and Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Quiz Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 3 Neural Networks Assessment"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Deep Learning"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Topic Focus Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Target Focus Topics (Optional)
          </label>
          <input
            type="text"
            value={topicFocusInput}
            onChange={(e) => setTopicFocusInput(e.target.value)}
            onKeyDown={handleAddTopic}
            placeholder="Type a topic and press Enter (e.g. Backpropagation, Vanishing Gradients)"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30"
                >
                  <Tag className="w-3 h-3 text-indigo-400" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTopic(t)}
                    className="hover:text-rose-400 ml-1 text-sm font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Difficulty Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["easy", "medium", "hard", "adaptive"] as QuizDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`py-2.5 rounded-xl text-xs font-bold capitalize border transition-all ${
                  difficulty === d
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders: Question Count & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <span>Question Count</span>
              <span className="text-indigo-400 font-mono text-sm">{questionCount}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>2</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              <span>Exam Duration</span>
              <span className="text-indigo-400 font-mono text-sm">{durationMinutes} mins</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>5m</span>
              <span>30m</span>
              <span>60m</span>
            </div>
          </div>
        </div>

        {/* Question Types Checkboxes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Allowed Question Types
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { type: "single_choice" as QuestionType, label: "Single Choice (MCQ)" },
              { type: "multi_choice" as QuestionType, label: "Multi-Select" },
              { type: "true_false" as QuestionType, label: "True / False" },
              { type: "short_answer" as QuestionType, label: "Short Answer" },
            ].map(({ type, label }) => {
              const isChecked = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                    isChecked
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
                  }`}
                >
                  <span className="text-left">{label}</span>
                  {isChecked && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating || documents.length === 0}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all hover:scale-101 disabled:opacity-50 pt-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Grounded Questions with AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Verified Quiz</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function QuizCreatePage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400 py-12">Loading configurator...</div>}>
      <QuizCreateForm />
    </Suspense>
  );
}
