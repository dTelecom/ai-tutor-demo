# Language Tutor — Structured Lessons Plan

## Product

### User Flow

```
Landing Page
  → Choose Language (Spanish / Japanese)
  → Choose Level (Beginner ✓ / Intermediate 🔒 / Advanced 🔒)
  → See 3 Lessons (sequential, 15 min each)
  → Click Lesson → Enter Name → Start
  → Voice Session: 10 min teaching + 5 min voice test
  → Tutor decides pass/fail → result published to client
  → Pass → next lesson unlocks. Fail → retry.
```

### Levels

| Level | Status | Description |
|---|---|---|
| Beginner | Available | Zero knowledge assumed. Survival phrases. |
| Intermediate | Locked | "Coming Soon" badge. Greyed out. |
| Advanced | Locked | "Coming Soon" badge. Greyed out. |

Only Beginner is playable. Intermediate and Advanced exist as locked cards to show product direction.

### Lesson Structure (15 min each)

Every lesson has two phases:

| Phase | Duration | What happens |
|---|---|---|
| **Teaching** | ~10 min | Tutor introduces vocabulary, models pronunciation, runs practice drills. Socratic method — asks questions, gives hints. |
| **Test** | ~5 min | Tutor announces "test time", asks 5-8 questions covering the lesson material. Student must answer in the target language. Tutor evaluates each answer and decides pass/fail at the end. |

**Pass criteria:** tutor judges holistically — did the student demonstrate understanding of the core phrases? Doesn't need to be perfect. The LLM prompt defines what "pass" means for each lesson.

**Pass:** tutor congratulates, publishes `{ result: 'pass' }` via data channel. Client marks lesson complete, unlocks next.

**Fail:** tutor encourages retry, publishes `{ result: 'fail', feedback: '...' }`. Client shows "Try Again" with tutor's feedback.

**Student can always exit early** — lesson stays incomplete (not failed, just not done).

### Lessons — Spanish Beginner

| # | Title | Teaching Focus | Test |
|---|---|---|---|
| 1 | Greetings & Introductions | Hola, buenos días, me llamo..., ¿cómo te llamas?, mucho gusto, numbers 1-5 | "Greet me", "Introduce yourself", "How do you say 3?", "Say goodbye" |
| 2 | At a Café | Un café por favor, la cuenta, quiero..., ¿cuánto cuesta?, numbers 6-10 | "Order a coffee", "Ask for the bill", "How much is it?", "Say thank you" |
| 3 | Getting Around | ¿Dónde está...?, izquierda/derecha, necesito un taxi, el hotel, perdón | "Ask where the hotel is", "Give directions (left, right)", "Call a taxi" |

### Lessons — Japanese Beginner

| # | Title | Teaching Focus | Test |
|---|---|---|---|
| 1 | Greetings & Introductions | Ohayou, konnichiwa, watashi wa ... desu, hajimemashite, yoroshiku | "Greet me (morning)", "Introduce yourself", "Say nice to meet you" |
| 2 | At a Restaurant | Sumimasen, kore/sore/are, ikura desu ka, oishii, numbers 1-10 | "Get waiter's attention", "Ask what this is", "Ask the price", "Count to 5" |
| 3 | Everyday Phrases | Daijoubu, wakarimasen, mou ichido, doko, ima nanji | "Say you don't understand", "Ask to repeat", "Ask where something is" |

### Lesson Unlocking

- Lesson 1: always available
- Lesson 2: available after Lesson 1 **passed**
- Lesson 3: available after Lesson 2 **passed**
- Student can redo any passed lesson (practice mode, no re-test)

### Session Timer

- 15-minute countdown visible in session UI
- At ~10:00, tutor transitions to test phase (driven by prompt, not hard timer)
- At 14:00 (1 min left), if still testing, tutor wraps up and gives verdict
- At 15:00, session auto-ends. Agent disconnects.
- Agent publishes `{ remaining }` on `timer` topic every 10s for client countdown
- Timer color: white (normal) → amber (< 2 min) → red (< 30s)

### Memory: Cross-Lesson Continuity

The tutor remembers what the student learned, struggled with, and their name across lessons. This is powered by the memory plugin (see Tech section).

Example behaviors:
- Lesson 2 starts: "Welcome back, Vadim! In our last lesson you learned greetings. Today we'll practice ordering at a café."
- Student repeats a mistake from Lesson 1: "Remember, it's 'me llamo' not 'mi llamo' — we covered that last time!"
- Lesson 3 builds on vocabulary: "You already know 'por favor' from the café lesson. Now let's use it to ask for directions."

### Progress Persistence

**Client-side** (localStorage) — for UI unlock state:
```json
{
  "tutor:es:progress": { "passedLessons": [1], "studentName": "Vadim" },
  "tutor:ja:progress": { "passedLessons": [], "studentName": "Vadim" }
}
```

**Server-side** (SQLite via memory plugin) — for tutor knowledge across lessons:
- Every turn stored with embeddings
- Session summaries generated on lesson end
- Searchable across all past lessons for this student/room

---

## Design

### Page 1: Landing (language selection)

```
┌─────────────────────────────────────┐
│                                     │
│          🎓 Language Tutor          │
│   Practice speaking with an AI      │
│                                     │
│   ┌──────────┐  ┌──────────┐       │
│   │ 🇪🇸       │  │ 🇯🇵       │       │
│   │ Spanish   │  │ Japanese  │       │
│   │ Español   │  │ 日本語     │       │
│   └──────────┘  └──────────┘       │
│                                     │
└─────────────────────────────────────┘
```

Click language → `/lessons/es` or `/lessons/ja`

### Page 2: Lessons

```
┌─────────────────────────────────────────────────┐
│  ← Back            Spanish · Beginner           │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Beginner │  │Intermed.│  │Advanced │         │
│  │  ✓      │  │  🔒     │  │  🔒     │         │
│  └─────────┘  └─────────┘  └─────────┘        │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │ ✅ Lesson 1: Greetings       15 min │       │
│  │ Hola, me llamo..., mucho gusto      │       │
│  │                         [Redo]      │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │ Lesson 2: At a Café          15 min │       │
│  │ Ordering, prices, numbers 6-10      │       │
│  │                        [Start]      │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │ 🔒 Lesson 3: Getting Around  15 min │       │
│  │ Pass Lesson 2 to unlock             │       │
│  └─────────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Level tabs (Beginner active, others greyed + lock)
- Lesson cards: passed (green check + Redo), available (Start), locked (lock + hint)
- Clicking Start/Redo → inline name input (remembered from localStorage)

### Page 3: Session (with timer + test phase indicator)

```
┌─────────────────────────────────────────────────┐
│  Lesson 2: At a Café              ⏱ 12:34      │
│  ───────────────────────────────── Teaching      │
│                                                 │
│  ┌─────────────────┐  ┌──────────────────────┐ │
│  │                  │  │ Transcript           │ │
│  │    🎓 Avatar     │  │                      │ │
│  │                  │  │ Tutor: Hola Vadim!   │ │
│  │   Listening...   │  │ You: Hola Tessa...   │ │
│  │                  │  │ Tutor: Muy bien! ...  │ │
│  └─────────────────┘  └──────────────────────┘ │
│                                                 │
│         [🎤 Mute]    [End Session]              │
└─────────────────────────────────────────────────┘
```

When test phase starts, label changes:
```
│  Lesson 2: At a Café              ⏱ 04:12      │
│  ───────────────────────────────── 📝 Test       │
```

### Page 4: Lesson Result

**Passed:**
```
┌─────────────────────────────────────┐
│                                     │
│          🎉 Lesson Passed!          │
│                                     │
│   Lesson 2: At a Café              │
│                                     │
│   What you learned:                 │
│   • Ordering: un café por favor     │
│   • Prices: ¿cuánto cuesta?        │
│   • Numbers 6-10                    │
│   • La cuenta, por favor            │
│                                     │
│   [Next: Lesson 3 →]               │
│   [Back to Lessons]                 │
│                                     │
└─────────────────────────────────────┘
```

**Failed:**
```
┌─────────────────────────────────────┐
│                                     │
│       Almost there! Try again.      │
│                                     │
│   Lesson 2: At a Café              │
│                                     │
│   Tutor's feedback:                 │
│   "You did great with ordering      │
│    but struggled with numbers.      │
│    Practice 6-10 and try again!"    │
│                                     │
│   [Try Again]                       │
│   [Back to Lessons]                 │
│                                     │
└─────────────────────────────────────┘
```

**Exited early (no result):**
```
│   Session ended before the test.    │
│   Complete the full lesson to pass. │
│                                     │
│   [Try Again]    [Back to Lessons]  │
```

---

## Tech

### Part 1: Memory Plugin for @dtelecom/agents-js SDK

Port the memory system from `/Users/vf/docs/agents/` into the new `agents-js` SDK as a first-class plugin. This is a **core SDK feature**, not example-specific code.

#### Old agents memory (what we're porting)

3-layer stack: Embedder → MemoryStore → RoomMemory
- **Embedder**: Xenova/all-MiniLM-L6-v2 via @huggingface/transformers (384-dim, runs locally in Node.js)
- **MemoryStore**: SQLite (better-sqlite3) + sqlite-vec extension for KNN cosine search
- **RoomMemory**: High-level API — storeTurn (async batched), searchRelevant (embed query → KNN), endSession (LLM summary)

#### New SDK structure

```
src/
  memory/
    embedder.ts         — Port from old agents. Local embeddings via Transformers.js
    memory-store.ts     — Port from old agents. SQLite + sqlite-vec storage
    room-memory.ts      — Port from old agents. Session lifecycle + search
    index.ts            — Export all memory types
```

#### Integration with Pipeline

The pipeline already has `ContextManager.buildMessages()`. Add memory search before building messages:

```typescript
// pipeline.ts — in processTurn()
let memoryContext = '';
if (this.memory) {
  memoryContext = await this.memory.searchRelevant(text);
}
const messages = this.context.buildMessages(memoryContext);
```

Store every turn:
```typescript
// In handleTranscription (all turns, even if agent doesn't respond)
this.memory?.storeTurn(speaker, text, false);

// After agent response
this.memory?.storeTurn('assistant', fullResponse, true);
```

Session end:
```typescript
// In pipeline.stop() or agent.stop()
await this.memory?.endSession(this.llm);  // generates summary
```

#### Agent config addition

```typescript
interface AgentConfig {
  // ... existing fields
  memory?: {
    enabled: boolean;
    dbPath?: string;  // default: './data/memory.db'
  };
}
```

#### New dependencies for SDK

```json
{
  "better-sqlite3": "^11.0.0",
  "sqlite-vec": "^0.1.0",
  "@huggingface/transformers": "^3.0.0"
}
```

These should be **optional peer dependencies** — only needed if memory is enabled. The SDK should work without them (no memory = no import).

### Part 2: Lesson Prompt Files

Each lesson is a markdown file read at runtime by the API route.

```
lessons/
  es-beginner-1.md    — Spanish: Greetings & Introductions
  es-beginner-2.md    — Spanish: At a Café
  es-beginner-3.md    — Spanish: Getting Around
  ja-beginner-1.md    — Japanese: Greetings & Introductions
  ja-beginner-2.md    — Japanese: At a Restaurant
  ja-beginner-3.md    — Japanese: Everyday Phrases
```

#### Prompt structure

```markdown
# Role
You are Tessa, a friendly and encouraging [language] tutor.
This is Lesson [N]: [Title] for a beginner student.

# Rules
- 1-2 sentences max per response (this is spoken, not written)
- Keep each language in its own sentence (for TTS pronunciation)
- Socratic method: ask → hint → correct. Never lecture.
- [language-specific: romaji for Japanese, etc.]

# Memory
You may receive context from past lessons. Use it:
- Greet the student by name if you know it
- Reference what they learned before
- Note past mistakes and gently reinforce corrections

# Lesson Plan (~10 minutes)
Follow these sections in order. Move on when the student shows understanding.
Don't rush — if they struggle, spend more time on that section.

## Section 1: [Topic] (0-3 min)
Teach: [specific phrases with pronunciation]
Practice: [what to ask the student to do]
Success: [what demonstrates understanding]

## Section 2: [Topic] (3-7 min)
Teach: ...
Practice: ...
Success: ...

## Section 3: [Topic] (7-10 min)
Teach: ...
Practice: ...
Success: ...

# Test Phase (~5 minutes)
When you've covered all sections (or at ~10 minutes), announce the test:
"Great practice! Now let's do a quick test to see what you remember."

Ask 5-8 questions. Each question should require the student to produce
a phrase in [language], not just say yes/no. Examples:
1. [test question]
2. [test question]
...

After each answer, briefly confirm correct or gently correct wrong.
Keep track mentally of how many they get right.

# Scoring
After all test questions, decide:
- **PASS** if the student got ≥60% correct (roughly 4 out of 6).
  Minor pronunciation issues are OK. Understanding matters more than perfection.
- **FAIL** if below 60%. Be encouraging — they're learning!

# Announcing the Result
CRITICAL: You must end with EXACTLY one of these two formats.
The system parses your final message to detect the result.

If PASS, your final message must contain the marker [PASS]:
"Congratulations! You passed the test! [PASS] You did really well with
greetings and introductions. See you in the next lesson!"

If FAIL, your final message must contain the marker [FAIL]:
"You're making great progress, but let's practice a bit more. [FAIL]
You did well with greetings but need more practice with numbers.
Try this lesson again — you'll get it!"

The text after [PASS] or [FAIL] is shown to the student as feedback.

# Wrap-up (if running out of time)
If the session is about to end and you haven't finished the test,
wrap up quickly — give remaining questions faster, then score.
```

#### Why markers in text?

The agent parses the tutor's final spoken sentence for `[PASS]` or `[FAIL]`. This is simpler than a separate structured output call because:
1. The tutor naturally announces the result as part of the conversation
2. No extra LLM call needed
3. The marker is stripped before TTS (not spoken aloud)
4. The feedback text after the marker is published to the client for the result screen

### Part 3: Agent-Side Test Logic

```typescript
// tutor-agent.ts additions

// Parse sentences for [PASS]/[FAIL] markers
agent.on('sentence', (text) => {
  publishTranscript(text.replace(/\[(PASS|FAIL)\]/g, ''), true);

  const passMatch = text.match(/\[PASS\](.*)/s);
  const failMatch = text.match(/\[FAIL\](.*)/s);

  if (passMatch) {
    // Wait for TTS to finish, then publish result
    setTimeout(() => {
      publishData({ result: 'pass', feedback: passMatch[1].trim() }, 'lesson-result');
    }, 3000);
  } else if (failMatch) {
    setTimeout(() => {
      publishData({ result: 'fail', feedback: failMatch[1].trim() }, 'lesson-result');
    }, 3000);
  }
});
```

### Part 4: Timer

Agent-side (authoritative):
```typescript
const LESSON_DURATION = 900; // 15 min
const startTime = Date.now();

// Publish remaining time every 10s
const timerInterval = setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const remaining = Math.max(0, LESSON_DURATION - elapsed);
  publishData({ remaining: Math.round(remaining) }, 'timer');

  if (remaining <= 0) {
    clearInterval(timerInterval);
    // If no result published yet, tell LLM to wrap up
    agent.say("Time's up! Let me give you your result.");
    // Agent will generate final verdict via normal LLM flow
  }
}, 10000);
```

Client-side: receives `timer` messages, interpolates locally between updates for smooth countdown.

### Part 5: Data Flow for Test Results

```
Agent LLM generates: "Congratulations! [PASS] Great job with greetings!"
  ↓
Pipeline emits sentence event (text with marker)
  ↓
tutor-agent.ts onSentence:
  1. Strip marker, publish clean text to transcript
  2. Detect [PASS] or [FAIL]
  3. After delay (let audio play), publish on 'lesson-result' topic:
     { result: 'pass', feedback: 'Great job with greetings!' }
  ↓
Client TutorSession.tsx receives 'lesson-result':
  1. Write to localStorage: add lesson to passedLessons
  2. Switch to LessonResult screen
  ↓
End session (agent calls memory.endSession → summary stored)
```

### Part 6: New/Modified Files Summary

```
SDK (src/):
  memory/
    embedder.ts           — NEW: Local embeddings (Transformers.js)
    memory-store.ts       — NEW: SQLite + sqlite-vec storage
    room-memory.ts        — NEW: High-level session memory API
    index.ts              — NEW: Exports
  core/
    types.ts              — ADD: MemoryConfig to AgentConfig, PipelineOptions
    pipeline.ts           — ADD: memory.storeTurn(), memory.searchRelevant()
    context-manager.ts    — ADD: buildMessages(memoryContext?) param
    voice-agent.ts        — ADD: memory init/shutdown lifecycle
  index.ts                — ADD: memory exports

Example (examples/ai-tutor/):
  lessons/
    es-beginner-1.md      — NEW: Spanish Lesson 1 prompt
    es-beginner-2.md      — NEW: Spanish Lesson 2 prompt
    es-beginner-3.md      — NEW: Spanish Lesson 3 prompt
    ja-beginner-1.md      — NEW: Japanese Lesson 1 prompt
    ja-beginner-2.md      — NEW: Japanese Lesson 2 prompt
    ja-beginner-3.md      — NEW: Japanese Lesson 3 prompt
  lib/
    types.ts              — ADD: Level, Lesson, LessonResult types
    subjects.ts           — REWRITE: languages + lessons structure
    progress.ts           — NEW: localStorage helpers for lesson progress
  app/
    page.tsx              — SIMPLIFY: language cards only → /lessons/[lang]
    lessons/
      [lang]/
        page.tsx          — NEW: Level tabs + lesson list + start
    session/
      [roomName]/
        page.tsx          — ADD: timer, test phase, result handling
    api/
      start-session/
        route.ts          — MODIFY: accept lessonId, read .md, pass memory config
  components/
    SubjectCard.tsx       — No change (language cards)
    LessonCard.tsx        — NEW: lesson card (passed/available/locked)
    LevelTabs.tsx         — NEW: beginner/intermediate/advanced tabs
    SessionTimer.tsx      — NEW: countdown timer
    LessonPhase.tsx       — NEW: "Teaching" / "Test" indicator
    LessonResult.tsx      — NEW: pass/fail/incomplete screen
    TutorSession.tsx      — MODIFY: timer, phase, result handling
    AgentAvatar.tsx       — No change
    TranscriptPanel.tsx   — No change
    SessionControls.tsx   — No change
  agent/
    tutor-agent.ts        — MODIFY: timer, [PASS]/[FAIL] parsing, memory config
```

### Implementation Order

**Phase 1: Memory Plugin (SDK)**
1. Port `embedder.ts` from old agents
2. Port `memory-store.ts` from old agents
3. Port `room-memory.ts` from old agents
4. Integrate into Pipeline (storeTurn, searchRelevant)
5. Integrate into VoiceAgent (init, lifecycle, config)
6. Add memory exports to index.ts
7. Test memory with existing test-bot

**Phase 2: Lesson Structure (Example)**
8. Data model — types.ts (Level, Lesson, LessonResult)
9. Write 6 lesson prompt files (.md)
10. Languages config — rewrite subjects.ts with lessons array
11. Progress module — progress.ts (localStorage)

**Phase 3: UI (Example)**
12. Lessons page — `/lessons/[lang]/page.tsx` + LevelTabs + LessonCard
13. Landing page — simplify to language selection only
14. Session UI — SessionTimer, LessonPhase, timer data channel
15. Result screen — LessonResult (pass/fail/incomplete)
16. API route — accept lessonId, read .md, pass to agent

**Phase 4: Agent Logic (Example)**
17. Agent timer — publish remaining time, auto-wrap-up
18. Agent result parsing — [PASS]/[FAIL] in sentences
19. Agent memory — enable memory, student context across lessons
20. End-to-end test — full lesson flow
