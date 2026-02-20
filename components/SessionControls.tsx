"use client";

import {
  useLocalParticipant,
  useRoomContext,
} from "@dtelecom/components-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SessionControls() {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  async function toggleMute() {
    const next = !muted;
    await localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  function endSession() {
    room.disconnect();
    router.push("/");
  }

  return (
    <div className="flex items-center justify-center gap-4 border-t border-white/10 p-4">
      <button
        onClick={toggleMute}
        className={`rounded-lg px-6 py-2 font-medium transition-colors ${
          muted
            ? "bg-red-600 hover:bg-red-700"
            : "bg-white/10 hover:bg-white/20"
        }`}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
      <button
        onClick={endSession}
        className="rounded-lg bg-white/10 px-6 py-2 font-medium transition-colors hover:bg-red-600"
      >
        End Session
      </button>
    </div>
  );
}
