import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@dtelecom/components-react", () => ({
  useConnectionState: vi.fn(),
}));

vi.mock("@dtelecom/livekit-client", () => ({
  ConnectionState: {
    Disconnected: "disconnected",
    Connecting: "connecting",
    Connected: "connected",
    Reconnecting: "reconnecting",
  },
}));

import ConnectionStateOverlay from "@/components/ConnectionStateOverlay";
import { useConnectionState } from "@dtelecom/components-react";
import { ConnectionState } from "@dtelecom/livekit-client";

describe("ConnectionStateOverlay", () => {
  it("renders nothing when connected", () => {
    vi.mocked(useConnectionState).mockReturnValue(ConnectionState.Connected as any);

    const { container } = render(<ConnectionStateOverlay />);
    expect(container.innerHTML).toBe("");
  });

  it("shows connecting overlay", () => {
    vi.mocked(useConnectionState).mockReturnValue(ConnectionState.Connecting as any);

    render(<ConnectionStateOverlay />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows reconnecting overlay", () => {
    vi.mocked(useConnectionState).mockReturnValue(ConnectionState.Reconnecting as any);

    render(<ConnectionStateOverlay />);
    expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
  });

  it("renders nothing when disconnected", () => {
    vi.mocked(useConnectionState).mockReturnValue(ConnectionState.Disconnected as any);

    const { container } = render(<ConnectionStateOverlay />);
    expect(container.innerHTML).toBe("");
  });
});
