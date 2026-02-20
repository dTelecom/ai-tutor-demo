import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LessonCard from "@/components/LessonCard";
import type { Lesson } from "@/lib/types";

const mockLesson: Lesson = {
  id: "es-beginner-1",
  languageId: "es",
  level: "beginner",
  number: 1,
  title: "Greetings & Introductions",
  description: "Hola, me llamo...",
  durationMin: 15,
  objectives: ["Greetings", "Introductions"],
  greeting: "Hola!",
  promptFile: "es-beginner-1.md",
};

describe("LessonCard", () => {
  it("renders lesson title, description, and duration", () => {
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={false}
        loading={false}
        disabled={false}
        onStart={() => {}}
      />,
    );

    expect(screen.getByText("Greetings & Introductions")).toBeInTheDocument();
    expect(screen.getByText("Hola, me llamo...")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
  });

  it("shows Start button when unlocked and not passed", () => {
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={false}
        loading={false}
        disabled={false}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("shows Retry button when passed", () => {
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={true}
        loading={false}
        disabled={false}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("shows Locked button when not unlocked", () => {
    render(
      <LessonCard
        lesson={{ ...mockLesson, number: 2 }}
        unlocked={false}
        passed={false}
        loading={false}
        disabled={true}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Locked" })).toBeInTheDocument();
  });

  it("shows Starting... when loading", () => {
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={false}
        loading={true}
        disabled={true}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Starting..." })).toBeInTheDocument();
  });

  it("calls onStart when clicked", () => {
    const onStart = vi.fn();
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={false}
        loading={false}
        disabled={false}
        onStart={onStart}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("disables button when disabled prop is true", () => {
    render(
      <LessonCard
        lesson={mockLesson}
        unlocked={true}
        passed={false}
        loading={false}
        disabled={true}
        onStart={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });
});
