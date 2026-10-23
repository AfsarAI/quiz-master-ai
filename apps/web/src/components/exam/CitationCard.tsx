"use client";

import React, { useState } from "react";
import type { CitationInfo } from "@quiz-master/shared-types";
import { BookOpen, ChevronDown, ChevronUp, Quote, ExternalLink } from "lucide-react";

interface CitationCardProps {
  citation: CitationInfo | null | undefined;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!citation || (!citation.quote && !citation.source_document)) {
    return null;
  }

  return (
    <div className="mt-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Source Grounding Citation</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] border border-indigo-500/30">
            {citation.source_document} {citation.page_number ? `• Page ${citation.page_number}` : ""}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-indigo-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-indigo-500/20 bg-slate-950/40 text-xs text-slate-300">
          {citation.section_heading && (
            <div className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <span className="text-indigo-400">Section:</span> {citation.section_heading}
            </div>
          )}

          {citation.quote && (
            <div className="relative pl-3.5 border-l-2 border-indigo-500 italic text-slate-300 bg-indigo-500/5 py-1.5 rounded-r">
              <Quote className="w-3.5 h-3.5 text-indigo-400/60 inline mr-1" />
              "{citation.quote}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
