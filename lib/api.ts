import type { StartSessionResponse } from "./types";

export async function startSession(
  lessonId: string,
  studentName: string,
  userId: string,
): Promise<StartSessionResponse> {
  const res = await fetch("/api/start-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId, studentName, userId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Failed to start session");
  }

  return res.json();
}
