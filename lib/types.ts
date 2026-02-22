// ─── Language ────────────────────────────────────────────────────────────────

export interface Language {
  id: string;
  name: string;
  nativeName: string;
  icon: string;
  description: string;
}

// ─── Level ───────────────────────────────────────────────────────────────────

export type LevelId = "beginner" | "intermediate" | "advanced";

export interface Level {
  id: LevelId;
  name: string;
  available: boolean;
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;            // "es-beginner-1"
  languageId: string;    // "es"
  level: LevelId;
  number: number;        // 1, 2, 3
  title: string;         // "Greetings & Introductions"
  description: string;   // "Hola, me llamo..."
  durationMin: number;   // 15
  objectives: string[];  // shown on completion screen
  greeting: string;      // spoken by tutor at start
  promptFile: string;    // "es-beginner-1.md"
}

// ─── Lesson Result ───────────────────────────────────────────────────────────

export type LessonResult = "pass" | "fail" | "incomplete";

export interface LessonResultData {
  result: LessonResult;
  feedback?: string;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface LessonProgress {
  passedLessons: number[];
  studentName: string;
  userId?: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface TranscriptEntry {
  id: string;
  speaker: "student" | "tutor";
  text: string;
  timestamp: number;
}

export interface StartSessionResponse {
  token: string;
  wsUrl: string;
  roomName: string;
}
