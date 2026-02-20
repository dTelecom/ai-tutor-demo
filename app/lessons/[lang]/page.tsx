"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { getLanguage, getLessonsForLanguage } from "@/lib/languages";
import { isLessonUnlocked, isLessonPassed, getSavedStudentName, saveStudentName } from "@/lib/progress";
import LessonCard from "@/components/LessonCard";
import { startSession } from "@/lib/api";

export default function LessonsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const router = useRouter();
  const language = getLanguage(lang);
  const lessons = getLessonsForLanguage(lang);

  const [studentName, setStudentName] = useState(() => getSavedStudentName(lang));
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!language) {
    router.push("/");
    return null;
  }

  async function handleStart(lessonId: string) {
    const name = studentName.trim();
    if (!name) return;

    setStarting(lessonId);
    setError(null);
    saveStudentName(lang, name);

    try {
      const { token, wsUrl, roomName } = await startSession(lessonId, name);
      sessionStorage.setItem(
        `tutor:${roomName}`,
        JSON.stringify({ token, wsUrl, lessonId }),
      );
      router.push(`/session/${roomName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStarting(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-white/40 hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <div>
            <h1 className="text-3xl font-bold">
              {language.icon} {language.name}
            </h1>
            <p className="text-sm text-white/40">{language.nativeName}</p>
          </div>
        </div>

        {/* Name input */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm text-white/60">
            Your name
          </label>
          <input
            id="name"
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Beginner lessons */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/80">Beginner</h2>

          <div className="space-y-3">
            {lessons.map((lesson) => {
              const unlocked = isLessonUnlocked(lang, lesson.number);
              const passed = isLessonPassed(lang, lesson.number);
              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  unlocked={unlocked}
                  passed={passed}
                  loading={starting === lesson.id}
                  disabled={!unlocked || !studentName.trim() || starting !== null}
                  onStart={() => handleStart(lesson.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Locked levels */}
        <div className="space-y-2 opacity-40">
          <h2 className="text-lg font-semibold">Intermediate</h2>
          <p className="text-sm text-white/60">Coming soon</p>
        </div>
        <div className="space-y-2 opacity-40">
          <h2 className="text-lg font-semibold">Advanced</h2>
          <p className="text-sm text-white/60">Coming soon</p>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
