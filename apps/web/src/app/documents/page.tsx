"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Document, DocumentStatusResponse } from "@quiz-master/shared-types";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Clock,
} from "lucide-react";

export default function DocumentsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, initialize } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active processing state for live progress bar
  const [activeDocStatus, setActiveDocStatus] = useState<DocumentStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const loadDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!token && typeof window !== "undefined") {
      router.replace("/login");
      return;
    }
    if (token) {
      loadDocuments();
    }
  }, [token, authLoading, router]);

  // Polling hook for active document processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && activeDocStatus && activeDocStatus.status === "PROCESSING") {
      interval = setInterval(async () => {
        try {
          const res = await api.getDocumentStatus(activeDocStatus.document_id);
          setActiveDocStatus(res);
          if (res.status === "READY" || res.status === "FAILED") {
            setIsPolling(false);
            loadDocuments();
          }
        } catch (e) {
          console.error("Status poll error", e);
          setIsPolling(false);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPolling, activeDocStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
      setUploadError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await api.uploadDocument(selectedFile, customTitle || selectedFile.name);
      setActiveDocStatus({
        document_id: res.document_id,
        status: "PROCESSING",
        title: res.title,
        page_count: 0,
        chunk_count: 0,
        extracted_topics: [],
      });
      setIsPolling(true);
      setSelectedFile(null);
      setCustomTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Document Ingestion Hub</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload syllabi, slides, or chapters (PDF, DOCX, TXT) to create dense vector indexes for grounded quiz generation.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/70 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="text-sm font-bold text-slate-200 text-center">
              {selectedFile ? (
                <span className="text-indigo-400 font-semibold">{selectedFile.name}</span>
              ) : (
                <>
                  Click to browse or <span className="text-indigo-400">drag & drop educational files</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">Supports PDF, DOCX and TXT up to 25 MB</div>
          </div>

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {selectedFile && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Document Title (e.g. Unit 3 Neural Networks)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isUploading ? "Uploading..." : "Process Document"}</span>
              </button>
            </div>
          )}
        </form>

        {/* Live Ingestion Pipeline Progress Monitor */}
        {activeDocStatus && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Pipeline Activity: {activeDocStatus.title}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeDocStatus.status === "READY"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : activeDocStatus.status === "FAILED"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                }`}
              >
                {activeDocStatus.status}
              </span>
            </div>

            {/* Stages Bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div
                className={`p-2.5 rounded-xl border ${
                  activeDocStatus.status === "PROCESSING" || activeDocStatus.status === "READY"
                    ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                <div className="font-semibold">Text Extraction</div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  activeDocStatus.status === "PROCESSING" || activeDocStatus.status === "READY"
                    ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <Database className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <div className="font-semibold">pgvector Embeddings</div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  activeDocStatus.status === "READY"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="font-semibold">Ready for Quizzing</div>
              </div>
            </div>

            {activeDocStatus.status === "READY" && (
              <div className="mt-4 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                <span className="text-xs text-emerald-300">
                  Ready! {activeDocStatus.chunk_count} chunks indexed across {activeDocStatus.page_count} pages.
                </span>
                <Link
                  href={`/quiz/create?docId=${activeDocStatus.document_id}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Quiz</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-3">Your Document Library</h2>
        {documents.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
            No documents uploaded yet. Drop a PDF or textbook above to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{doc.page_count} pages</span>
                      <span>•</span>
                      <span>{doc.chunk_count} chunks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      doc.status === "READY"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : doc.status === "FAILED"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {doc.status}
                  </span>

                  {doc.status === "READY" && (
                    <Link
                      href={`/quiz/create?docId=${doc.id}`}
                      className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors"
                      title="Generate Quiz"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
