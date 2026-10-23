"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sparkles, BookOpen, Layers, BarChart3, PlusCircle, LogOut, User as UserIcon } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, initialize, logout } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Don't show full nav in exam mode
  const isExamMode = pathname.includes("/take");

  const navLinks = [
    { label: "Dashboard", href: "/dashboard", icon: Layers },
    { label: "Documents", href: "/documents", icon: BookOpen },
    { label: "Analytics & Weak Areas", href: "/analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Quiz-Master<span className="text-indigo-400 font-black">.AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Enterprise RAG
            </span>
          </div>
        </Link>

        {/* Center Nav (hidden in exam mode) */}
        {!isExamMode && user && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right CTA / Auth controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {!isExamMode && (
                <Link
                  href="/quiz/create"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-glow transition-all hover:scale-102"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">New AI Quiz</span>
                </Link>
              )}

              {/* User badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user.full_name}</div>
                  <div className="text-[10px] capitalize text-indigo-400">{user.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
