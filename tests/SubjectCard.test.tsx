import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubjectCard from "@/components/SubjectCard";
import type { Language } from "@/lib/types";

const mockLanguage: Language = {
  id: "es",
  name: "Spanish",
  nativeName: "Español",
  icon: "🇪🇸",
  description: "Conversational Spanish",
};

describe("SubjectCard", () => {
  it("renders language name, icon, nativeName, and description", () => {
    render(<SubjectCard language={mockLanguage} selected={false} onClick={() => {}} />);

    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("🇪🇸")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Conversational Spanish")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SubjectCard language={mockLanguage} selected={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("has selected styles when selected", () => {
    render(<SubjectCard language={mockLanguage} selected={true} onClick={() => {}} />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("border-blue-500");
    expect(button.className).toContain("bg-white/10");
  });

  it("has unselected styles when not selected", () => {
    render(<SubjectCard language={mockLanguage} selected={false} onClick={() => {}} />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("border-white/10");
  });
});
