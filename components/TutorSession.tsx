"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  useRemoteParticipants,
  useRoomContext,
} from "@dtelecom/components-react";
import { DataPacket_Kind, RoomEvent, Track } from "@dtelecom/livekit-client";
import { useRouter } from "next/navigation";
import type { TranscriptEntry, LessonResult } from "@/lib/types";
import { getLesson } from "@/lib/languages";
import { markLessonPassed } from "@/lib/progress";
import AgentAvatar from "./AgentAvatar";
import type { AgentStatus } from "./AgentAvatar";
import TranscriptPanel from "./TranscriptPanel";
import SessionControls from "./SessionControls";

interface TutorSessionProps {
  roomName: string;
  lessonId: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TutorSession({ roomName, lessonId }: TutorSessionProps) {
  const room = useRoomContext();
  const router = useRouter();
  const remoteParticipants = useRemoteParticipants();
  const agentParticipant = remoteParticipants.find(
    (p) => p.identity === "tutor-agent",
  );

  const lesson = getLesson(lessonId);

  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null);

  // Track whether we've already saved the pass result
  const savedResult = useRef(false);

  const handleData = useCallback(
    (payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
      if (!topic) return;

      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));

        if (topic === "status") {
          const s = msg.status as string;
          if (s === "idle" || s === "listening" || s === "thinking" || s === "speaking") {
            setAgentStatus(s);
          }
          return;
        }

        if (topic === "timer") {
          setTimeRemaining(msg.remaining);
          return;
        }

        if (topic === "lesson-result") {
          const result = msg.result as LessonResult;
          setLessonResult(result);
          return;
        }

        if (topic === "transcript") {
          if (msg.isInterim) {
            setInterimText(msg.text);
            return;
          }

          if (!msg.isAgent) {
            setInterimText(null);
          }

          const entry: TranscriptEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker: msg.isAgent ? "tutor" : "student",
            text: msg.text,
            timestamp: Date.now(),
          };
          setEntries((prev) => [...prev, entry]);
        }
      } catch {
        // ignore malformed data
      }
    },
    [],
  );

  useEffect(() => {
    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, handleData]);

  // Signal the agent that we've subscribed to its audio track.
  // Retries silently if the Publisher PeerConnection isn't ready yet.
  // Also checks on mount in case TrackSubscribed already fired during connection.
  const sentReady = useRef(false);
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    const sendReady = () => {
      if (sentReady.current) return;
      try {
        const payload = new TextEncoder().encode(JSON.stringify({ ready: true }));
        room.localParticipant
          .publishData(payload, DataPacket_Kind.RELIABLE, { topic: "client-ready" })
          .then(() => { sentReady.current = true; })
          .catch(() => { retryTimer = setTimeout(sendReady, 200); });
      } catch {
        retryTimer = setTimeout(sendReady, 200);
      }
    };

    // Check if we already have the agent's audio track (event fired before mount)
    for (const p of remoteParticipants) {
      for (const pub of p.audioTracks.values()) {
        if (pub.isSubscribed) {
          sendReady();
        }
      }
    }

    // Listen for future track subscriptions
    const onTrackSubscribed = (track: { kind: string }) => {
      if (track.kind === Track.Kind.Audio) {
        sendReady();
      }
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      clearTimeout(retryTimer);
    };
  }, [room, remoteParticipants]);

  // Save pass result to progress
  useEffect(() => {
    if (lessonResult === "pass" && lesson && !savedResult.current) {
      savedResult.current = true;
      markLessonPassed(lesson.languageId, lesson.number);
    }
  }, [lessonResult, lesson]);

  // Result overlay
  if (lessonResult) {
    const passed = lessonResult === "pass";
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-8">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
            passed ? "bg-green-500/20" : "bg-amber-500/20"
          }`}
        >
          {passed ? "\u2713" : "\u2717"}
        </div>
        <h2 className="text-2xl font-bold">
          {passed ? "Lesson Passed!" : "Not Quite Yet"}
        </h2>
        <p className="max-w-md text-center text-white/60">
          {passed
            ? "Great job! You can move on to the next lesson."
            : "Don't worry — you can retry this lesson anytime."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/lessons/${lesson?.languageId ?? "es"}`)}
            className="rounded-lg bg-white/10 px-6 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Back to Lessons
          </button>
        </div>
        <RoomAudioRenderer />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top bar: lesson info + timer */}
      {lesson && (
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">
              Lesson {lesson.number}: {lesson.title}
            </h2>
            <p className="text-xs text-white/40">{lesson.durationMin} min</p>
          </div>
          {timeRemaining !== null && (
            <div
              className={`text-sm font-mono tabular-nums ${
                timeRemaining <= 60 ? "text-red-400" : "text-white/60"
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left: Agent avatar */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <AgentAvatar participant={agentParticipant} status={agentStatus} />
        </div>

        {/* Right: Transcript */}
        <TranscriptPanel entries={entries} interimText={interimText} />
      </div>

      <SessionControls />
      <RoomAudioRenderer />
    </div>
  );
}
