"use client";

import React from "react";
import { useExamStore, QuestionStatus } from "@/store/examStore";
import { Bookmark, CheckCircle2, Circle, Eye, HelpCircle } from "lucide-react";

export const VisualPalette: React.FC = () => {
  const { quiz, currentIndex, setCurrentIndex, getQuestionStatus } = useExamStore();

  if (!quiz) return null;
  const questions = quiz.questions || [];

  // Compute status tallies
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let reviewCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q, idx) => {
    const status = getQuestionStatus(q.id, idx);
    if (status === "answered") answeredCount++;
    else if (status === "not_answered") notAnsweredCount++;
    else if (status === "review") reviewCount++;
    else if (status === "not_visited") notVisitedCount++;
  });

  const getStatusClasses = (status: QuestionStatus): string => {
    switch (status) {
      case "current":
        return "bg-sky-500 text-white font-bold ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900 shadow-glow-cyan scale-105";
      case "answered":
        return "bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shadow-glow-emerald";
      case "not_answered":
        return "bg-rose-500/80 text-white font-semibold hover:bg-rose-500";
      case "review":
        return "bg-purple-600 text-white font-semibold hover:bg-purple-500 shadow-glow-purple";
      case "not_visited":
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700/80 hover:bg-slate-700 hover:text-slate-200";
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          Question Palette
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {questions.length} Total
          </span>
        </h3>
      </div>

      {/* Status Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-purple-500 inline-block shadow-sm" />
          <span>Review ({reviewCount})</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 inline-block shadow-sm" />
          <span>Not Answered ({notAnsweredCount})</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-sky-400 inline-block shadow-sm" />
          <span>Current (Q{currentIndex + 1})</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600 inline-block" />
          <span>Not Visited ({notVisitedCount})</span>
        </div>
      </div>

      {/* Numbered Matrix Grid */}
      <div className="grid grid-cols-5 gap-2.5 pt-2">
        {questions.map((q, idx) => {
          const status = getQuestionStatus(q.id, idx);
          const classes = getStatusClasses(status);

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-10 w-full rounded-xl flex items-center justify-center text-sm transition-all duration-150 ${classes}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
