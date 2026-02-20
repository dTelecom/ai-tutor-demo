import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockSetMicrophoneEnabled = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn();
const mockPush = vi.fn();

vi.mock("@dtelecom/components-react", () => ({
  useLocalParticipant: vi.fn(() => ({
    localParticipant: { setMicrophoneEnabled: mockSetMicrophoneEnabled },
  })),
  useRoomContext: vi.fn(() => ({
    disconnect: mockDisconnect,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

import SessionControls from "@/components/SessionControls";

describe("SessionControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Mute and End Session buttons", () => {
    render(<SessionControls />);

    expect(screen.getByText("Mute")).toBeInTheDocument();
    expect(screen.getByText("End Session")).toBeInTheDocument();
  });

  it("toggles mute on click", async () => {
    render(<SessionControls />);

    fireEvent.click(screen.getByText("Mute"));

    expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
  });

  it("shows Unmute after muting", async () => {
    render(<SessionControls />);

    fireEvent.click(screen.getByText("Mute"));

    await waitFor(() => {
      expect(screen.getByText("Unmute")).toBeInTheDocument();
    });
  });

  it("disconnects and navigates home on End Session", () => {
    render(<SessionControls />);

    fireEvent.click(screen.getByText("End Session"));

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
