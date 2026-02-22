import type { LessonProgress } from "./types";

const STORAGE_PREFIX = "tutor:";

function getKey(languageId: string): string {
  return `${STORAGE_PREFIX}${languageId}:progress`;
}

export function getProgress(languageId: string): LessonProgress {
  if (typeof window === "undefined") {
    return { passedLessons: [], studentName: "" };
  }

  try {
    const raw = localStorage.getItem(getKey(languageId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return { passedLessons: [], studentName: "" };
}

export function saveProgress(languageId: string, progress: LessonProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKey(languageId), JSON.stringify(progress));
}

export function markLessonPassed(languageId: string, lessonNumber: number): void {
  const progress = getProgress(languageId);
  if (!progress.passedLessons.includes(lessonNumber)) {
    progress.passedLessons.push(lessonNumber);
    saveProgress(languageId, progress);
  }
}

export function isLessonUnlocked(languageId: string, lessonNumber: number): boolean {
  if (lessonNumber === 1) return true;
  const progress = getProgress(languageId);
  return progress.passedLessons.includes(lessonNumber - 1);
}

export function isLessonPassed(languageId: string, lessonNumber: number): boolean {
  const progress = getProgress(languageId);
  return progress.passedLessons.includes(lessonNumber);
}

export function getSavedStudentName(languageId: string): string {
  return getProgress(languageId).studentName;
}

export function saveStudentName(languageId: string, name: string): void {
  const progress = getProgress(languageId);
  progress.studentName = name;
  saveProgress(languageId, progress);
}

/** Return a stable userId for this language, creating one if needed. */
export function getUserId(languageId: string): string {
  const progress = getProgress(languageId);
  if (progress.userId) return progress.userId;

  const id = crypto.randomUUID();
  progress.userId = id;
  saveProgress(languageId, progress);
  return id;
}
