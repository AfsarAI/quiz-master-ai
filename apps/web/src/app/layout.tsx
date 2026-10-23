import type { Metadata } from "next";
import "@/styles/globals.css";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Quiz-Master-AI | Enterprise AI-First Educational Assessment & RAG Platform",
  description:
    "Automate educational assessment lifecycles with source-grounded RAG quiz generation, high-integrity exam portals, server-side grading, and personalized weakness remediation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased flex flex-col selection:bg-indigo-600 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 Quiz-Master-AI Platform. Enterprise-Grade AI Assessment.</span>
            <div className="flex items-center gap-4 text-slate-400">
              <span>FastAPI (Python 3.12)</span>
              <span>•</span>
              <span>PostgreSQL 16 + pgvector</span>
              <span>•</span>
              <span>Next.js 14 App Router</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
