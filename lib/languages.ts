import type { Language, Level, Lesson } from "./types";

// ─── Languages ───────────────────────────────────────────────────────────────

export const languages: Language[] = [
  {
    id: "es",
    name: "Spanish",
    nativeName: "Español",
    icon: "🇪🇸",
    description: "Conversational Spanish for everyday situations",
  },
  {
    id: "ja",
    name: "Japanese",
    nativeName: "日本語",
    icon: "🇯🇵",
    description: "Spoken Japanese with romaji pronunciation",
  },
];

export function getLanguage(id: string): Language | undefined {
  return languages.find((l) => l.id === id);
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export const levels: Level[] = [
  { id: "beginner", name: "Beginner", available: true },
  { id: "intermediate", name: "Intermediate", available: false },
  { id: "advanced", name: "Advanced", available: false },
];

// ─── Lessons ─────────────────────────────────────────────────────────────────

export const lessons: Lesson[] = [
  // Spanish Beginner
  {
    id: "es-beginner-1",
    languageId: "es",
    level: "beginner",
    number: 1,
    title: "Greetings & Introductions",
    description: "Hola, me llamo..., ¿cómo estás?, mucho gusto",
    durationMin: 15,
    objectives: [
      "Greetings: hola, buenos días, buenas tardes",
      "Introductions: me llamo..., ¿cómo te llamas?",
      "Polite phrases: mucho gusto, encantado/a",
      "Numbers 1-5: uno, dos, tres, cuatro, cinco",
    ],
    greeting: "Hi! I'm Tessa, your Spanish tutor. Welcome to your first lesson — today we'll learn greetings and how to introduce yourself!",
    promptFile: "es-beginner-1.md",
  },
  {
    id: "es-beginner-2",
    languageId: "es",
    level: "beginner",
    number: 2,
    title: "At a Café",
    description: "Ordering food and drinks, prices, numbers 6-10",
    durationMin: 15,
    objectives: [
      "Ordering: un café por favor, quiero...",
      "Polite requests: por favor, gracias, la cuenta",
      "Asking prices: ¿cuánto cuesta?",
      "Numbers 6-10: seis, siete, ocho, nueve, diez",
    ],
    greeting: "Hi! Welcome back! Today we're going to a Spanish café — you'll learn how to order food and drinks.",
    promptFile: "es-beginner-2.md",
  },
  {
    id: "es-beginner-3",
    languageId: "es",
    level: "beginner",
    number: 3,
    title: "Getting Around",
    description: "Directions, asking for help, transportation",
    durationMin: 15,
    objectives: [
      "Asking directions: ¿dónde está...?",
      "Directions: izquierda, derecha, todo recto",
      "Transportation: necesito un taxi, el hotel",
      "Asking for help: perdón, ¿puede ayudarme?",
    ],
    greeting: "Hi! Great to see you again! Today we'll learn how to find your way around — asking for directions in Spanish.",
    promptFile: "es-beginner-3.md",
  },

  // Japanese Beginner
  {
    id: "ja-beginner-1",
    languageId: "ja",
    level: "beginner",
    number: 1,
    title: "Greetings & Introductions",
    description: "Ohayou, konnichiwa, watashi wa ... desu",
    durationMin: 15,
    objectives: [
      "Greetings: ohayou, konnichiwa, konbanwa",
      "Introductions: watashi wa ... desu",
      "Meeting someone: hajimemashite, yoroshiku onegaishimasu",
      "Basic responses: hai, iie, arigatou",
    ],
    greeting: "Hi! I'm Tessa, your Japanese tutor. Today we'll learn basic greetings and how to introduce yourself in Japanese!",
    promptFile: "ja-beginner-1.md",
  },
  {
    id: "ja-beginner-2",
    languageId: "ja",
    level: "beginner",
    number: 2,
    title: "At a Restaurant",
    description: "Sumimasen, ordering, prices, numbers 1-10",
    durationMin: 15,
    objectives: [
      "Getting attention: sumimasen",
      "Pointing and asking: kore wa nan desu ka?",
      "Asking price: ikura desu ka?",
      "Numbers 1-10: ichi through juu",
    ],
    greeting: "Hi! Welcome back! Today we're visiting a Japanese restaurant — you'll learn how to order and ask about the menu.",
    promptFile: "ja-beginner-2.md",
  },
  {
    id: "ja-beginner-3",
    languageId: "ja",
    level: "beginner",
    number: 3,
    title: "Everyday Phrases",
    description: "Daijoubu, wakarimasen, directions, time",
    durationMin: 15,
    objectives: [
      "Understanding: wakarimasen, mou ichido onegaishimasu",
      "Reassurance: daijoubu, daijoubu desu",
      "Location: doko, koko, soko, asoko",
      "Basic time: ima nanji desu ka?",
    ],
    greeting: "Hi! So glad you're back! Today we'll learn everyday phrases you'll need in Japan — things like saying you don't understand and asking for directions.",
    promptFile: "ja-beginner-3.md",
  },
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function getLessonsForLanguage(languageId: string, level: string = "beginner"): Lesson[] {
  return lessons.filter((l) => l.languageId === languageId && l.level === level);
}
