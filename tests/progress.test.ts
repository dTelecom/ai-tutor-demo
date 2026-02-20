import { describe, it, expect, beforeEach } from "vitest";
import {
  getProgress,
  saveProgress,
  markLessonPassed,
  isLessonUnlocked,
  isLessonPassed,
  getSavedStudentName,
  saveStudentName,
} from "@/lib/progress";

describe("progress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty progress for new language", () => {
    const p = getProgress("es");
    expect(p).toEqual({ passedLessons: [], studentName: "" });
  });

  it("saves and retrieves progress", () => {
    saveProgress("es", { passedLessons: [1], studentName: "Alice" });
    const p = getProgress("es");
    expect(p.passedLessons).toEqual([1]);
    expect(p.studentName).toBe("Alice");
  });

  it("keeps languages isolated", () => {
    saveProgress("es", { passedLessons: [1, 2], studentName: "Alice" });
    const ja = getProgress("ja");
    expect(ja.passedLessons).toEqual([]);
  });

  it("markLessonPassed adds lesson number", () => {
    markLessonPassed("es", 1);
    expect(isLessonPassed("es", 1)).toBe(true);
    expect(isLessonPassed("es", 2)).toBe(false);
  });

  it("markLessonPassed does not duplicate", () => {
    markLessonPassed("es", 1);
    markLessonPassed("es", 1);
    expect(getProgress("es").passedLessons).toEqual([1]);
  });

  it("lesson 1 is always unlocked", () => {
    expect(isLessonUnlocked("es", 1)).toBe(true);
  });

  it("lesson 2 is locked until lesson 1 is passed", () => {
    expect(isLessonUnlocked("es", 2)).toBe(false);
    markLessonPassed("es", 1);
    expect(isLessonUnlocked("es", 2)).toBe(true);
  });

  it("lesson 3 is locked until lesson 2 is passed", () => {
    markLessonPassed("es", 1);
    expect(isLessonUnlocked("es", 3)).toBe(false);
    markLessonPassed("es", 2);
    expect(isLessonUnlocked("es", 3)).toBe(true);
  });

  it("saves and retrieves student name", () => {
    saveStudentName("es", "Alice");
    expect(getSavedStudentName("es")).toBe("Alice");
  });
});
