import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UpdateToast from "./UpdateToast";

function mockServiceWorker({ waiting, controller }: { waiting: object | null; controller: object | null }) {
  const reg = {
    waiting,
    installing: null,
    addEventListener: vi.fn(),
    update: vi.fn(() => Promise.resolve()),
  };
  const sw = {
    controller,
    register: vi.fn(() => Promise.resolve(reg)),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, "serviceWorker", { value: sw, configurable: true });
  return sw;
}

describe("UpdateToast", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers the worker with the build id", async () => {
    const sw = mockServiceWorker({ waiting: null, controller: null });
    render(<UpdateToast />);
    await waitFor(() => expect(sw.register).toHaveBeenCalledWith(expect.stringMatching(/^\/sw\.js\?v=/)));
  });

  it("offers a reload when an update is waiting and posts SKIP_WAITING on accept", async () => {
    const waiting = { postMessage: vi.fn() };
    mockServiceWorker({ waiting, controller: {} });
    render(<UpdateToast />);

    const button = await screen.findByRole("button", { name: "Muat ulang" });
    expect(screen.getByRole("status")).toHaveTextContent("Versi baru Si-Imsak tersedia.");
    fireEvent.click(button);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("stays hidden on the first install (no controlling worker yet)", async () => {
    const sw = mockServiceWorker({ waiting: { postMessage: vi.fn() }, controller: null });
    render(<UpdateToast />);
    await waitFor(() => expect(sw.register).toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    mockServiceWorker({ waiting: { postMessage: vi.fn() }, controller: {} });
    render(<UpdateToast />);
    fireEvent.click(await screen.findByRole("button", { name: "Nanti" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
