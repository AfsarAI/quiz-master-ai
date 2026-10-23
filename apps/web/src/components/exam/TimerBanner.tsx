"use client";

import React, { useEffect } from "react";
import { useExamStore } from "@/store/examStore";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerBannerProps {
  onTimeExpired: () => void;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ onTimeExpired }) => {
  const { secondsRemaining, decrementTimer, quiz } = useExamStore();

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, decrementTimer, onTimeExpired]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isLowTime = secondsRemaining <= 300; // < 5 mins
  const isCriticalTime = secondsRemaining <= 60; // < 1 min

  const totalSeconds = (quiz?.duration_minutes || 15) * 60;
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / totalSeconds) * 100));

  let containerClasses = "bg-slate-900/80 border-slate-700/80 text-slate-200";
  let clockColor = "text-indigo-400";
  let barColor = "bg-indigo-500";

  if (isCriticalTime) {
    containerClasses = "bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse-subtle shadow-glow-rose";
    clockColor = "text-rose-400 animate-bounce";
    barColor = "bg-rose-500";
  } else if (isLowTime) {
    containerClasses = "bg-amber-950/80 border-amber-500/80 text-amber-200";
    clockColor = "text-amber-400";
    barColor = "bg-amber-500";
  }

  return (
    <div className={`glass-panel px-4 py-2.5 rounded-xl border flex items-center justify-between shadow-lg transition-colors ${containerClasses}`}>
      <div className="flex items-center gap-2.5">
        <Clock className={`w-5 h-5 ${clockColor}`} />
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold opacity-75">Time Remaining</span>
          <div className="font-mono text-xl font-bold tracking-tight">{formattedTime}</div>
        </div>
      </div>

      <div className="w-32 hidden sm:block">
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${barColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {isCriticalTime && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Hurry!</span>
        </div>
      )}
    </div>
  );
};
