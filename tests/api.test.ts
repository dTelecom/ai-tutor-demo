import { describe, it, expect, vi, beforeEach } from "vitest";
import { startSession } from "@/lib/api";

describe("startSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with lessonId and studentName", async () => {
    const mockResponse = { token: "tok", wsUrl: "wss://sfu", roomName: "tutor-es-b1-abc" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await startSession("es-beginner-1", "Alice", "user-uuid-123");

    expect(fetch).toHaveBeenCalledWith("/api/start-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: "es-beginner-1", studentName: "Alice", userId: "user-uuid-123" }),
    });
    expect(result).toEqual(mockResponse);
  });

  it("throws on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "bad request" }),
    });

    await expect(startSession("es-beginner-1", "", "uid")).rejects.toThrow("bad request");
  });

  it("throws generic message when error response has no body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("parse error")),
    });

    await expect(startSession("es-beginner-1", "", "uid")).rejects.toThrow("Request failed");
  });
});
