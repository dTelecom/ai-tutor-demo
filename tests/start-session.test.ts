// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSpawn, mockAddGrant, mockGetWsUrl, mockToJwt } = vi.hoisted(() => ({
  mockSpawn: vi.fn(() => ({ on: vi.fn(), unref: vi.fn() })),
  mockAddGrant: vi.fn(),
  mockGetWsUrl: vi.fn().mockResolvedValue("wss://sfu.example.com"),
  mockToJwt: vi.fn().mockReturnValue("jwt-token-123"),
}));

vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

vi.mock("@dtelecom/server-sdk-js", () => ({
  AccessToken: vi.fn(function (this: any) {
    this.addGrant = mockAddGrant;
    this.getWsUrl = mockGetWsUrl;
    this.toJwt = mockToJwt;
  }),
}));

vi.mock("next/server", () => ({
  NextRequest: class extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(input, init);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      }),
  },
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(() => "You are Tessa, a Spanish tutor."),
  };
});

vi.mock("@/lib/languages", () => ({
  getLesson: vi.fn((id: string) => {
    if (id === "es-beginner-1")
      return {
        id: "es-beginner-1",
        languageId: "es",
        level: "beginner",
        number: 1,
        title: "Greetings & Introductions",
        durationMin: 15,
        greeting: "Hola!",
        promptFile: "es-beginner-1.md",
        objectives: [],
        description: "",
      };
    return undefined;
  }),
}));

import { POST } from "@/app/api/start-session/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3001/api/start-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/start-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = "test-key";
    process.env.API_SECRET = "test-secret";
  });

  it("returns 400 when lessonId is missing", async () => {
    const req = makeRequest({ studentName: "Alice" });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lessonId/i);
  });

  it("returns 400 when studentName is missing", async () => {
    const req = makeRequest({ lessonId: "es-beginner-1" });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid lesson", async () => {
    const req = makeRequest({ lessonId: "cooking-101", studentName: "Alice" });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 500 when API credentials missing", async () => {
    delete process.env.API_KEY;
    delete process.env.API_SECRET;

    const req = makeRequest({ lessonId: "es-beginner-1", studentName: "Alice" });
    const res = await POST(req as any);

    expect(res.status).toBe(500);
  });

  it("creates token and spawns agent on success", async () => {
    const req = makeRequest({ lessonId: "es-beginner-1", studentName: "Alice" });
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.token).toBe("jwt-token-123");
    expect(body.wsUrl).toBe("wss://sfu.example.com");
    expect(body.roomName).toMatch(/^tutor-es-beginner-1-/);
  });

  it("grants correct room permissions", async () => {
    const req = makeRequest({ lessonId: "es-beginner-1", studentName: "Alice" });
    await POST(req as any);

    expect(mockAddGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      }),
    );
  });

  it("spawns agent with lesson env vars", async () => {
    const req = makeRequest({ lessonId: "es-beginner-1", studentName: "Alice" });
    await POST(req as any);

    expect(mockSpawn).toHaveBeenCalledWith(
      "npx",
      ["tsx", expect.stringContaining("tutor-agent.ts")],
      expect.objectContaining({
        env: expect.objectContaining({
          AGENT_LANGUAGE: "es",
          AGENT_SYSTEM_PROMPT: "You are Tessa, a Spanish tutor.",
          AGENT_GREETING: "Hola!",
          AGENT_LESSON_DURATION: "900",
        }),
      }),
    );
  });

  it("resolves wsUrl using client IP from x-forwarded-for", async () => {
    const req = makeRequest({ lessonId: "es-beginner-1", studentName: "Alice" });
    await POST(req as any);

    expect(mockGetWsUrl).toHaveBeenCalledWith("1.2.3.4");
  });
});
