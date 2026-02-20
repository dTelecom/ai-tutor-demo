/**
 * Standalone tutor agent process.
 *
 * Reads from environment:
 *   AGENT_ROOM             — room name to join
 *   AGENT_LANGUAGE          — language id (es, ja)
 *   AGENT_SYSTEM_PROMPT     — full system prompt for the LLM
 *   AGENT_GREETING          — greeting spoken when student joins
 *   AGENT_LESSON_DURATION   — lesson duration in seconds (default: 900)
 *   API_KEY                 — dTelecom API key
 *   API_SECRET              — dTelecom API secret
 *   DEEPGRAM_API_KEY
 *   OPENROUTER_API_KEY
 *   CARTESIA_API_KEY          — required when TTS_PROVIDER=cartesia
 *   TTS_PROVIDER              — 'deepgram' (default) or 'cartesia'
 *   LLM_MODEL               — OpenRouter model (default: openai/gpt-4.1-mini)
 *
 * Run manually:
 *   AGENT_ROOM=tutor-es-abc123 AGENT_LANGUAGE=es AGENT_SYSTEM_PROMPT="..." AGENT_GREETING="..." npx tsx agent/tutor-agent.ts
 */

import { VoiceAgent } from '@dtelecom/agents-js';
import { DeepgramSTT, OpenRouterLLM, CartesiaTTS, DeepgramTTS } from '@dtelecom/agents-js/providers';
import type { TTSPlugin } from '@dtelecom/agents-js';

const PASS_MARKER = /\[PASS\]/i;
const FAIL_MARKER = /\[FAIL\]/i;

function createTTS(language: string): TTSPlugin {
  const provider = process.env.TTS_PROVIDER || 'deepgram';

  if (provider === 'cartesia') {
    return new CartesiaTTS({
      apiKey: process.env.CARTESIA_API_KEY!,
      voiceId: process.env.CARTESIA_VOICE_ID || '6ccbfb76-1fc6-48f7-b71d-91ac6298247b',
    });
  }

  // Deepgram multi-language: pick models based on lesson language
  const ttsModels: Record<string, string> = language === 'ja'
    ? { en: 'aura-2-thalia-en', ja: 'aura-2-izanami-ja' }
    : { en: 'aura-2-thalia-en', es: 'aura-2-celeste-es' };

  return new DeepgramTTS({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    model: ttsModels,
  });
}

function buildInstructions(base: string, ttsProvider: string, language: string): string {
  if (ttsProvider !== 'deepgram') return base;

  const langCode = language; // 'es' or 'ja'
  return base + `\n\n# Language Tags (required for TTS routing)
Wrap every non-English sentence in SSML lang tags. English sentences need no tag.
- Good: Great job! <lang xml:lang="${langCode}">Ahora repite: buenos días.</lang>
- Bad: Great job! Ahora repite: buenos días. (missing tag on non-English)
Without the tag, non-English text will be spoken with the English voice.`;
}

async function main() {
  const room = process.env.AGENT_ROOM;
  const language = process.env.AGENT_LANGUAGE || 'es';
  const baseInstructions = process.env.AGENT_SYSTEM_PROMPT;
  const greeting = process.env.AGENT_GREETING;
  const apiKey = process.env.API_KEY;
  const apiSecret = process.env.API_SECRET;
  const lessonDuration = parseInt(process.env.AGENT_LESSON_DURATION || '900', 10);
  const ttsProvider = process.env.TTS_PROVIDER || 'deepgram';

  if (!room) {
    console.error('AGENT_ROOM is required');
    process.exit(1);
  }
  if (!apiKey || !apiSecret) {
    console.error('API_KEY and API_SECRET are required');
    process.exit(1);
  }
  if (!baseInstructions) {
    console.error('AGENT_SYSTEM_PROMPT is required');
    process.exit(1);
  }
  if (!greeting) {
    console.error('AGENT_GREETING is required');
    process.exit(1);
  }

  const instructions = buildInstructions(baseInstructions, ttsProvider, language);

  const agent = new VoiceAgent({
    stt: new DeepgramSTT({
      apiKey: process.env.DEEPGRAM_API_KEY!,
      language: 'multi',
      endpointing: 100,
    }),
    llm: new OpenRouterLLM({
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: process.env.LLM_MODEL || 'openai/gpt-4.1-mini',
      providerRouting: { sort: 'latency' },
    }),
    tts: createTTS(language),
    instructions,
    memory: {
      enabled: true,
      dbPath: process.env.MEMORY_DB_PATH || './data/memory.db',
    },
  });

  // ── Data channel helpers ──────────────────────────────────────────────────

  function publish(topic: string, data: Record<string, unknown>) {
    const agentRoom = agent.room;
    if (!agentRoom) return;
    const payload = new TextEncoder().encode(JSON.stringify(data));
    agentRoom.localParticipant.publishData(payload, { topic });
  }

  function publishTranscript(text: string, isAgent: boolean, isInterim = false) {
    publish('transcript', { text, isAgent, isInterim });
  }

  // ── Audio dump ────────────────────────────────────────────────────────────

  if (process.env.DUMP_AUDIO) {
    agent.enableAudioDump(process.env.DUMP_AUDIO);
    console.log(`Audio dump enabled → ${process.env.DUMP_AUDIO}`);
  }

  // ── Lesson timer ──────────────────────────────────────────────────────────

  let lessonStartTime = 0;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let lessonEnded = false;

  function getTimeRemaining(): number {
    if (!lessonStartTime) return lessonDuration;
    const elapsed = Math.floor((Date.now() - lessonStartTime) / 1000);
    return Math.max(0, lessonDuration - elapsed);
  }

  function startTimer() {
    lessonStartTime = Date.now();
    publish('timer', { remaining: lessonDuration });

    timerInterval = setInterval(() => {
      const remaining = getTimeRemaining();
      publish('timer', { remaining });

      if (remaining <= 0 && !lessonEnded) {
        stopTimer();
      }
    }, 10_000); // every 10 seconds
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ── [PASS]/[FAIL] parsing ─────────────────────────────────────────────────

  function publishResult(result: 'pass' | 'fail') {
    if (lessonEnded) return;
    lessonEnded = true;
    stopTimer();
    publish('lesson-result', { result });
    console.log(`Lesson result: ${result.toUpperCase()}`);
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  agent.on('transcription', (result) => {
    if (result.text.trim()) {
      if (result.isFinal) {
        console.log(`[Student] ${result.text}`);
        publishTranscript(result.text, false);
      } else {
        publishTranscript(result.text, false, true);
      }
    }
  });

  agent.on('sentence', (text) => {
    // Check for result markers before publishing transcript
    if (PASS_MARKER.test(text)) {
      publishResult('pass');
    } else if (FAIL_MARKER.test(text)) {
      publishResult('fail');
    }

    // Strip markers from displayed transcript
    const clean = text.replace(PASS_MARKER, '').replace(FAIL_MARKER, '').trim();
    if (clean) {
      console.log(`[Tutor] ${clean}`);
      publishTranscript(clean, true);
    }
  });

  agent.on('agentState', (state) => {
    publish('status', { status: state });
  });

  agent.on('error', (err) => {
    console.error('[Agent error]', err);
  });

  agent.on('disconnected', () => {
    stopTimer();
    console.log('Room disconnected, exiting');
    process.exit(0);
  });

  // ── Start agent ───────────────────────────────────────────────────────────

  console.log(`Starting tutor agent for room "${room}" (language: ${language}, duration: ${lessonDuration}s)`);

  await agent.start({
    room,
    apiKey,
    apiSecret,
    identity: 'tutor-agent',
    name: 'AI Tutor',
  });

  // Wait for the client to confirm it has subscribed to the agent's audio track.
  // The client sends "client-ready" via data channel once TrackSubscribed fires
  // on its side, retrying if the Publisher PC isn't ready yet.
  const agentRoom = agent.room!;
  let greeted = false;

  agentRoom.on('dataReceived', (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
    if (topic === 'client-ready' && !greeted) {
      greeted = true;
      console.log('Client ready — starting greeting');
      console.log(`Greeting student: "${greeting}"`);
      publish('status', { status: 'thinking' });
      startTimer();
      agent.say(greeting);
    }
  });

  console.log('Agent is running. Press Ctrl+C to stop.');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    stopTimer();
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    stopTimer();
    await agent.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
