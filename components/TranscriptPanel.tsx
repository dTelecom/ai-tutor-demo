"use client";

import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "@/lib/types";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  interimText?: string | null;
}

export default function TranscriptPanel({ entries, interimText }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, interimText]);

  return (
    <div className="flex min-h-0 w-96 flex-col border-l border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="font-medium text-white/80">Transcript</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {entries.map((entry) => (
          <div key={entry.id}>
            <span
              className={`text-xs font-medium ${
                entry.speaker === "tutor" ? "text-blue-400" : "text-green-400"
              }`}
            >
              {entry.speaker === "tutor" ? "Tutor" : "You"}
            </span>
            <p className="mt-0.5 text-sm text-white/80">{entry.text}</p>
          </div>
        ))}
        {interimText && (
          <div>
            <span className="text-xs font-medium text-green-400/50">You</span>
            <p className="mt-0.5 text-sm italic text-white/40">{interimText}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
