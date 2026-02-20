import { describe, it, expect } from "vitest";
import { languages, getLanguage, lessons, getLesson, getLessonsForLanguage } from "@/lib/languages";

describe("languages", () => {
  it("has 2 languages", () => {
    expect(languages).toHaveLength(2);
  });

  it("each language has required fields", () => {
    for (const l of languages) {
      expect(l.id).toBeTruthy();
      expect(l.name).toBeTruthy();
      expect(l.nativeName).toBeTruthy();
      expect(l.icon).toBeTruthy();
      expect(l.description).toBeTruthy();
    }
  });

  it("has expected language ids", () => {
    const ids = languages.map((l) => l.id);
    expect(ids).toEqual(["es", "ja"]);
  });
});

describe("getLanguage", () => {
  it("returns language by id", () => {
    const es = getLanguage("es");
    expect(es).toBeDefined();
    expect(es!.name).toBe("Spanish");
  });

  it("returns undefined for unknown id", () => {
    expect(getLanguage("unknown")).toBeUndefined();
  });
});

describe("lessons", () => {
  it("has 6 lessons total (3 per language)", () => {
    expect(lessons).toHaveLength(6);
  });

  it("each lesson has required fields", () => {
    for (const l of lessons) {
      expect(l.id).toBeTruthy();
      expect(l.languageId).toBeTruthy();
      expect(l.title).toBeTruthy();
      expect(l.greeting).toBeTruthy();
      expect(l.promptFile).toBeTruthy();
      expect(l.objectives.length).toBeGreaterThan(0);
      expect(l.durationMin).toBe(15);
    }
  });

  it("getLessonsForLanguage returns 3 beginner lessons", () => {
    const esLessons = getLessonsForLanguage("es");
    expect(esLessons).toHaveLength(3);
    expect(esLessons[0].number).toBe(1);
    expect(esLessons[2].number).toBe(3);
  });

  it("getLesson finds by id", () => {
    const lesson = getLesson("ja-beginner-2");
    expect(lesson).toBeDefined();
    expect(lesson!.title).toBe("At a Restaurant");
  });
});
