"use client";

import type { Participant } from "@dtelecom/livekit-client";

export type AgentStatus = "waiting" | "preparing" | "idle" | "listening" | "thinking" | "speaking";

interface AgentAvatarProps {
  participant: Participant | undefined;
  status: AgentStatus;
}

export default function AgentAvatar({ participant, status }: AgentAvatarProps) {
  const displayStatus = !participant ? "waiting" : status;

  const statusText: Record<AgentStatus, string> = {
    waiting: "Waiting for tutor to join...",
    preparing: "Preparing...",
    idle: "Ready",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer ring container — holds the pulsing animation */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings when speaking */}
        {displayStatus === "speaking" && (
          <>
            <div className="absolute h-32 w-32 animate-[ping_1.5s_ease-out_infinite] rounded-full bg-blue-500/20" />
            <div className="absolute h-36 w-36 animate-[ping_2s_ease-out_infinite_0.3s] rounded-full bg-purple-500/10" />
          </>
        )}

        {/* Thinking / preparing pulse */}
        {(displayStatus === "thinking" || displayStatus === "preparing") && (
          <div className="absolute h-32 w-32 animate-pulse rounded-full bg-amber-500/15" />
        )}

        {/* Listening pulse — subtle green to show STT is picking up speech */}
        {displayStatus === "listening" && (
          <div className="absolute h-32 w-32 animate-pulse rounded-full bg-emerald-500/15" />
        )}

        {/* Avatar circle */}
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-5xl transition-all duration-300 ${
            displayStatus === "speaking"
              ? "scale-110 shadow-[0_0_40px_rgba(99,102,241,0.5)]"
              : displayStatus === "thinking" || displayStatus === "preparing"
                ? "shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                : displayStatus === "listening"
                  ? "shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  : displayStatus === "waiting"
                    ? "opacity-50"
                    : ""
          }`}
        >
          <span>🎓</span>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">AI Tutor</h2>
        <p
          className={`text-sm ${
            displayStatus === "speaking"
              ? "text-blue-400"
              : displayStatus === "thinking" || displayStatus === "preparing"
                ? "text-amber-400"
                : displayStatus === "listening"
                  ? "text-emerald-400"
                  : "text-white/60"
          }`}
        >
          {statusText[displayStatus]}
        </p>
      </div>
    </div>
  );
}
