import { AccessToken } from "@dtelecom/server-sdk-js";
import { DtelecomGateway, InsufficientCreditsError } from "@dtelecom/x402-client";
import { privateKeyToAccount } from "viem/accounts";
import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";
import { readFileSync } from "fs";
import { getLesson } from "@/lib/languages";

/** x402 gateway singleton — created once if WALLET_PRIVATE_KEY + GATEWAY_URL are set. */
const gateway =
  process.env.WALLET_PRIVATE_KEY && process.env.GATEWAY_URL
    ? new DtelecomGateway({
        gatewayUrl: process.env.GATEWAY_URL,
        account: privateKeyToAccount(
          process.env.WALLET_PRIVATE_KEY as `0x${string}`,
        ),
      })
    : null;

/** Auto top-up: buy $1 of credits when balance drops below 500k microcredits (~2 sessions). */
async function ensureCredits() {
  if (!gateway) return;
  try {
    const acct = await gateway.getAccount();
    if (BigInt(acct.availableBalance) < BigInt(500_000)) {
      await gateway.buyCredits({ amountUsd: 1.0 });
    }
  } catch {
    // Account doesn't exist yet — first purchase creates it
    await gateway.buyCredits({ amountUsd: 1.0 });
  }
}

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
    const { lessonId, studentName, userId, sttProvider, ttsProvider } =
      await req.json();

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

    // Generate room name
    const roomId = Math.random().toString(36).slice(2, 8);
    const roomName = `tutor-${lessonId}-${roomId}`;

    // ── WebRTC — dual mode ──────────────────────────────────────────────────
    let token: string;
    let wsUrl: string;
    const agentEnv: Record<string, string> = {};

    if (apiKey && apiSecret) {
      // Legacy mode: API_KEY + API_SECRET
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
      token = at.toJwt();
      const clientIp = (req.headers.get("x-forwarded-for") ?? "127.0.0.1")
        .split(",")[0]
        .trim();
      wsUrl = await at.getWsUrl(clientIp);

      // Agent will use API_KEY/API_SECRET from process.env
    } else if (gateway) {
      // x402 mode — single bundled call for WebRTC + STT + TTS
      await ensureCredits();

      const clientIp = (req.headers.get("x-forwarded-for") ?? "127.0.0.1")
        .split(",")[0]
        .trim();

      let bundle;
      try {
        bundle = await gateway.createAgentSession({
          roomName,
          participantIdentity: "tutor-agent",
          clientIdentity: studentName,
          clientIp,
          durationMinutes: 16,
          language: lesson.languageId,
        });
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          await gateway.buyCredits({ amountUsd: 1.0 });
          bundle = await gateway.createAgentSession({
            roomName,
            participantIdentity: "tutor-agent",
            clientIdentity: studentName,
            clientIp,
            durationMinutes: 16,
            language: lesson.languageId,
          });
        } else {
          throw err;
        }
      }

      token = bundle.webrtc.client.token;
      wsUrl = bundle.webrtc.client.wsUrl;

      agentEnv.AGENT_TOKEN = bundle.webrtc.agent.token;
      agentEnv.AGENT_WS_URL = bundle.webrtc.agent.wsUrl;
      agentEnv.AGENT_STT_URL = bundle.stt.serverUrl;
      agentEnv.AGENT_STT_TOKEN = bundle.stt.token;
      agentEnv.AGENT_TTS_URL = bundle.tts.serverUrl;
      agentEnv.AGENT_TTS_TOKEN = bundle.tts.token;
    } else {
      return NextResponse.json(
        {
          error:
            "Configure API_KEY+API_SECRET or WALLET_PRIVATE_KEY+GATEWAY_URL",
        },
        { status: 500 },
      );
    }

    // ── dTelecom STT/TTS — x402 only (legacy mode needs separate sessions) ──
    const effectiveSTT = sttProvider || process.env.STT_PROVIDER || "deepgram";
    const effectiveTTS = ttsProvider || process.env.TTS_PROVIDER || "deepgram";

    if (apiKey && apiSecret) {
      // Legacy WebRTC mode — STT/TTS still need x402 gateway
      if (effectiveSTT === "dtelecom") {
        if (!gateway) {
          return NextResponse.json(
            { error: "dTelecom STT requires WALLET_PRIVATE_KEY+GATEWAY_URL" },
            { status: 500 },
          );
        }
        await ensureCredits();
        const sttSession = await gateway.createSTTSession({
          durationMinutes: 16,
          language: lesson.languageId,
        });
        agentEnv.AGENT_STT_URL = sttSession.serverUrl;
        agentEnv.AGENT_STT_TOKEN = sttSession.token;
      }

      if (effectiveTTS === "dtelecom") {
        if (!gateway) {
          return NextResponse.json(
            { error: "dTelecom TTS requires WALLET_PRIVATE_KEY+GATEWAY_URL" },
            { status: 500 },
          );
        }
        await ensureCredits();
        const ttsSession = await gateway.createTTSSession({
          maxCharacters: 10000,
          language: lesson.languageId,
        });
        agentEnv.AGENT_TTS_URL = ttsSession.serverUrl;
        agentEnv.AGENT_TTS_TOKEN = ttsSession.token;
      }
    }

    // ── Spawn agent process ─────────────────────────────────────────────────
    try {
      const agentPath = resolve(process.cwd(), "agent/tutor-agent.ts");
      const child = spawn("npx", ["tsx", agentPath], {
        env: {
          ...process.env,
          ...agentEnv,
          AGENT_ROOM: roomName,
          AGENT_LANGUAGE: lesson.languageId,
          AGENT_SYSTEM_PROMPT: systemPrompt,
          AGENT_GREETING: lesson.greeting,
          AGENT_LESSON_DURATION: String(lesson.durationMin * 60),
          AGENT_USER_ID: userId || "",
          DEBUG: process.env.DEBUG || "@dtelecom/agents*",
          DUMP_AUDIO: process.env.DUMP_AUDIO || "",
          ...(sttProvider && { STT_PROVIDER: sttProvider }),
          ...(ttsProvider && { TTS_PROVIDER: ttsProvider }),
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
