import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AgentAvatar from "@/components/AgentAvatar";

const mockParticipant = { identity: "tutor-agent" } as any;

describe("AgentAvatar", () => {
  it("shows waiting state when no participant", () => {
    render(<AgentAvatar participant={undefined} status="idle" />);

    expect(screen.getByText("AI Tutor")).toBeInTheDocument();
    expect(screen.getByText("Waiting for tutor to join...")).toBeInTheDocument();
  });

  it("shows idle state", () => {
    render(<AgentAvatar participant={mockParticipant} status="idle" />);

    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows listening state", () => {
    render(<AgentAvatar participant={mockParticipant} status="listening" />);

    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("shows thinking state", () => {
    render(<AgentAvatar participant={mockParticipant} status="thinking" />);

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows speaking state", () => {
    render(<AgentAvatar participant={mockParticipant} status="speaking" />);

    expect(screen.getByText("Speaking...")).toBeInTheDocument();
  });

  it("applies scale animation when speaking", () => {
    const { container } = render(
      <AgentAvatar participant={mockParticipant} status="speaking" />,
    );

    const avatarCircle = container.querySelector(".bg-gradient-to-br");
    expect(avatarCircle?.className).toContain("scale-110");
  });

  it("has opacity when waiting for participant", () => {
    const { container } = render(
      <AgentAvatar participant={undefined} status="idle" />,
    );

    const avatarCircle = container.querySelector(".bg-gradient-to-br");
    expect(avatarCircle?.className).toContain("opacity-50");
  });

  it("shows green glow when listening", () => {
    const { container } = render(
      <AgentAvatar participant={mockParticipant} status="listening" />,
    );

    const avatarCircle = container.querySelector(".bg-gradient-to-br");
    expect(avatarCircle?.className).toContain("shadow-");
  });
});
