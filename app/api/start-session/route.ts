import { AccessToken } from "@dtelecom/server-sdk-js";
import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";
import { readFileSync } from "fs";
import { getLesson } from "@/lib/languages";

/** Track spawned agent processes so we can kill them on exit. */
const agentProcesses = new Set<ChildProcess>();

function cleanupAgents() {
  for (const child of agentProcesses) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already dead
    }
  }
  agentProcesses.clear();
}

// Kill all agents when the parent process exits
process.on("SIGINT", () => {
  cleanupAgents();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanupAgents();
  process.exit(0);
});
process.on("exit", cleanupAgents);

export async function POST(req: NextRequest) {
  try {
    const { lessonId, studentName, userId } = await req.json();

    if (!lessonId || !studentName) {
      return NextResponse.json(
        { error: "lessonId and studentName are required" },
        { status: 400 },
      );
    }

    const lesson = getLesson(lessonId);
    if (!lesson) {
      return NextResponse.json(
        { error: "Invalid lesson" },
        { status: 400 },
      );
    }

    // Read lesson prompt from .md file
    const promptPath = resolve(process.cwd(), "lessons", lesson.promptFile);
    let systemPrompt: string;
    try {
      systemPrompt = readFileSync(promptPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: `Lesson prompt file not found: ${lesson.promptFile}` },
        { status: 500 },
      );
    }

    const apiKey = process.env.API_KEY;
    const apiSecret = process.env.API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "API_KEY and API_SECRET must be configured" },
        { status: 500 },
      );
    }

    // Generate room name
    const roomId = Math.random().toString(36).slice(2, 8);
    const roomName = `tutor-${lessonId}-${roomId}`;

    // Create student token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: studentName,
      name: studentName,
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();

    const clientIp = (req.headers.get("x-forwarded-for") ?? "127.0.0.1")
      .split(",")[0]
      .trim();
    const wsUrl = await at.getWsUrl(clientIp);

    // Spawn agent process
    try {
      const agentPath = resolve(process.cwd(), "agent/tutor-agent.ts");
      const child = spawn("npx", ["tsx", agentPath], {
        env: {
          ...process.env,
          AGENT_ROOM: roomName,
          AGENT_LANGUAGE: lesson.languageId,
          AGENT_SYSTEM_PROMPT: systemPrompt,
          AGENT_GREETING: lesson.greeting,
          AGENT_LESSON_DURATION: String(lesson.durationMin * 60),
          AGENT_USER_ID: userId || "",
          DEBUG: process.env.DEBUG || "@dtelecom/agents*",
          DUMP_AUDIO: process.env.DUMP_AUDIO || "",
        },
        stdio: ["ignore", "inherit", "inherit"],
      });

      agentProcesses.add(child);
      child.on("exit", () => {
        agentProcesses.delete(child);
      });
    } catch (spawnErr) {
      console.error("Failed to spawn agent:", spawnErr);
      // Don't fail the request — student can still join, agent can be started manually
    }

    return NextResponse.json({ token, wsUrl, roomName });
  } catch (e: unknown) {
    console.error("[start-session] ERROR:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
