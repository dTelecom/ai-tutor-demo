"use client";

import { LiveKitRoom } from "@dtelecom/components-react";
import "@dtelecom/components-styles";
import { useRouter } from "next/navigation";
import TutorSession from "@/components/TutorSession";
import ConnectionStateOverlay from "@/components/ConnectionStateOverlay";
import { Suspense, use, useState, useEffect } from "react";

interface SessionData {
  token: string;
  wsUrl: string;
  lessonId: string;
}

function SessionContent({ roomName }: { roomName: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`tutor:${roomName}`);
    if (stored) {
      setSession(JSON.parse(stored));
      sessionStorage.removeItem(`tutor:${roomName}`);
    }
    setChecked(true);
  }, [roomName]);

  if (!checked) return null;

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.wsUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => router.push("/")}
      onError={(err) => console.error("Room error:", err)}
    >
      <div className="relative flex h-screen flex-col overflow-hidden">
        <ConnectionStateOverlay />
        <TutorSession roomName={roomName} lessonId={session.lessonId} />
      </div>
    </LiveKitRoom>
  );
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ roomName: string }>;
}) {
  const { roomName } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white">
          Connecting...
        </div>
      }
    >
      <SessionContent roomName={decodeURIComponent(roomName)} />
    </Suspense>
  );
}
