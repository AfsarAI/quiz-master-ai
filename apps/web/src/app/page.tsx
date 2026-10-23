import Link from "next/link";
import { Sparkles, ShieldCheck, Cpu, BarChart3, FileText, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-16">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 animate-fade-in shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Enterprise RAG & Psychometric Assessment Platform</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl font-extrabold text-center tracking-tight max-w-4xl bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent leading-tight mb-6">
        Turn Syllabi, Slides & Textbooks Into{" "}
        <span className="text-indigo-400 underline decoration-indigo-500/50 underline-offset-8">
          Verified Quizzes
        </span>{" "}
        in Seconds.
      </h1>

      <p className="text-base sm:text-xl text-slate-400 text-center max-w-2xl mb-10 leading-relaxed">
        Quiz-Master-AI couples high-dimensional vector embeddings with structured LLM agents to deliver hallucination-free assessments, tamper-proof timed examinations, and adaptive remediation.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
        <Link
          href="/register"
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-glow transition-all hover:scale-105"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/login"
          className="px-6 py-3.5 rounded-xl glass-panel text-slate-200 hover:text-white font-semibold text-base border border-slate-700/80 hover:bg-slate-800/80 transition-all"
        >
          Sign In
        </Link>
      </div>

      {/* Architecture Flow Visual Card */}
      <div className="w-full max-w-5xl glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/90 shadow-2xl mb-16">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="ml-3 text-xs font-mono text-slate-400">RAG Verification Flow</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
            pgvector + FastAPI + Next.js
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200 mb-1">1. Ingest Documents</h4>
            <p className="text-xs text-slate-400">PDF, DOCX & TXT sanitized, parsed and chunked with token overlap.</p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200 mb-1">2. Grounded RAG</h4>
            <p className="text-xs text-slate-400">Dense vector similarity retrieval ensures questions cite exact source chunks.</p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200 mb-1">3. Zero Client Trust</h4>
            <p className="text-xs text-slate-400">Answer keys and secret rubrics are strictly withheld until backend submission.</p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-200 mb-1">4. Adaptive Remediation</h4>
            <p className="text-xs text-slate-400">Auto-identifies conceptual blind spots and generates targeted re-test sets.</p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="text-indigo-400 font-extrabold text-2xl mb-1">100%</div>
          <div className="text-sm font-bold text-slate-200 mb-2">Source Grounded</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Eliminate AI hallucinations. Every question includes verbatim quotes, page numbers, and exact book citations.
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="text-emerald-400 font-extrabold text-2xl mb-1">Dual-Mode</div>
          <div className="text-sm font-bold text-slate-200 mb-2">Deterministic & Rubric AI</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Instant deterministic scoring for MCQs and structured multi-criteria rubric evaluation for short essays.
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="text-purple-400 font-extrabold text-2xl mb-1">Offline-Resilient</div>
          <div className="text-sm font-bold text-slate-200 mb-2">Auto-Save State</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Background sync to browser storage protects test-takers from accidental tab closures or wifi drops.
          </div>
        </div>
      </div>
    </div>
  );
}
