import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TranscriptPanel from "@/components/TranscriptPanel";
import type { TranscriptEntry } from "@/lib/types";

describe("TranscriptPanel", () => {
  it("shows empty transcript panel when no entries", () => {
    render(<TranscriptPanel entries={[]} />);
    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("Tutor")).not.toBeInTheDocument();
  });

  it("renders transcript entries", () => {
    const entries: TranscriptEntry[] = [
      { id: "1", speaker: "student", text: "What is 2+2?", timestamp: 1000 },
      { id: "2", speaker: "tutor", text: "That equals 4.", timestamp: 2000 },
    ];

    render(<TranscriptPanel entries={entries} />);

    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText("That equals 4.")).toBeInTheDocument();
  });

  it("labels student entries as 'You'", () => {
    const entries: TranscriptEntry[] = [
      { id: "1", speaker: "student", text: "Hello", timestamp: 1000 },
    ];

    render(<TranscriptPanel entries={entries} />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("labels tutor entries as 'Tutor'", () => {
    const entries: TranscriptEntry[] = [
      { id: "1", speaker: "tutor", text: "Hi there", timestamp: 1000 },
    ];

    render(<TranscriptPanel entries={entries} />);
    expect(screen.getByText("Tutor")).toBeInTheDocument();
  });

  it("has the Transcript header", () => {
    render(<TranscriptPanel entries={[]} />);
    expect(screen.getByText("Transcript")).toBeInTheDocument();
  });

  it("color-codes student (green) vs tutor (blue)", () => {
    const entries: TranscriptEntry[] = [
      { id: "1", speaker: "student", text: "Hi", timestamp: 1000 },
      { id: "2", speaker: "tutor", text: "Hello", timestamp: 2000 },
    ];

    render(<TranscriptPanel entries={entries} />);

    const youLabel = screen.getByText("You");
    const tutorLabel = screen.getByText("Tutor");

    expect(youLabel.className).toContain("text-green-400");
    expect(tutorLabel.className).toContain("text-blue-400");
  });
});
