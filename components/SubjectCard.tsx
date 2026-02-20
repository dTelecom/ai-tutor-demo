"use client";

import type { Language } from "@/lib/types";

interface SubjectCardProps {
  language: Language;
  selected: boolean;
  onClick: () => void;
}

export default function SubjectCard({
  language,
  selected,
  onClick,
}: SubjectCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-blue-500 hover:bg-white/5 ${
        selected
          ? "border-blue-500 bg-white/10"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <span className="text-4xl">{language.icon}</span>
      <h3 className="text-lg font-semibold">{language.name}</h3>
      <p className="text-xs text-white/40">{language.nativeName}</p>
      <p className="text-sm text-white/60">{language.description}</p>
    </button>
  );
}
