"use client";

import type { Lesson } from "@/lib/types";

interface LessonCardProps {
  lesson: Lesson;
  unlocked: boolean;
  passed: boolean;
  loading: boolean;
  disabled: boolean;
  onStart: () => void;
}

export default function LessonCard({
  lesson,
  unlocked,
  passed,
  loading,
  disabled,
  onStart,
}: LessonCardProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
        unlocked
          ? "border-white/10 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01] opacity-50"
      }`}
    >
      {/* Lesson number */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          passed
            ? "bg-green-500/20 text-green-400"
            : unlocked
              ? "bg-white/10 text-white"
              : "bg-white/5 text-white/30"
        }`}
      >
        {passed ? "\u2713" : lesson.number}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{lesson.title}</h3>
        <p className="text-sm text-white/50">{lesson.description}</p>
        <div className="mt-1 flex gap-3 text-xs text-white/30">
          <span>{lesson.durationMin} min</span>
          {passed && <span className="text-green-400">Passed</span>}
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onStart}
        disabled={disabled}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          !unlocked
            ? "cursor-not-allowed bg-white/5 text-white/20"
            : disabled
              ? "cursor-not-allowed bg-blue-500/30 text-white/50"
              : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {loading ? "Starting..." : passed ? "Retry" : !unlocked ? "Locked" : "Start"}
      </button>
    </div>
  );
}
