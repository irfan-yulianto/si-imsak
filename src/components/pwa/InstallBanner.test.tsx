import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InstallBanner from "./InstallBanner";

// Mock the icon component
vi.mock("@/components/ui/Icons", () => ({
  CrescentIcon: () => <div data-testid="crescent-icon" />
}));

describe("InstallBanner", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalUserAgent: string;
  let originalPlatform: string;
  let originalMaxTouchPoints: number;

  beforeEach(() => {
    // Save original values
    originalMatchMedia = window.matchMedia;
    originalUserAgent = navigator.userAgent;
    originalPlatform = navigator.platform;
    originalMaxTouchPoints = navigator.maxTouchPoints;

    // Reset localStorage
    localStorage.clear();

    // Default mock for matchMedia (not standalone)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Reset navigator properties
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      configurable: true
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true
    });
  });

  afterEach(() => {
    // Restore original values
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true
    });

    vi.restoreAllMocks();
  });

  it("should not render anything initially (hidden state)", () => {
    const { container } = render(<InstallBanner />);
    // It renders a wrapper with max-h-0 and opacity-0
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass("max-h-0");
    expect(banner).toHaveClass("opacity-0");
  });

  it("should not show if already in standalone mode", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
    }));

    const { container } = render(<InstallBanner />);
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass("max-h-0");
  });

  it("should not show if previously dismissed", () => {
    localStorage.setItem("pwa-install-dismissed", "1");

    const { container } = render(<InstallBanner />);
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass("max-h-0");
  });

  it("should handle localStorage errors gracefully when checking dismissal", () => {
    // Mock localStorage to throw an error
    const originalGetItem = localStorage.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error("Access denied");
    });

    const { container } = render(<InstallBanner />);

    // Should still run without crashing, but banner is not shown
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass("max-h-0");

    vi.restoreAllMocks();
  });

  it("should handle localStorage errors gracefully when dismissing", () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error("Access denied");
    });

    // Force iOS mode to show the banner
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      configurable: true
    });

    render(<InstallBanner />);

    const closeBtn = screen.getByRole("button", { name: "Tutup" });

    act(() => {
      fireEvent.click(closeBtn);
    });

    // It should not throw and should hide the banner
    const banner = screen.getByRole("button", { name: "Tutup" }).closest('div.relative');
    expect(banner).toHaveClass("max-h-0");

    vi.restoreAllMocks();
  });

  it("should show iOS instructions on iOS Safari", () => {
    // Mock iOS Safari
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      configurable: true
    });

    render(<InstallBanner />);

    // Check if it's visible
    expect(screen.getByText("Pasang Si-Imsak di Home Screen")).toBeInTheDocument();
    expect(screen.getByText(/"Add to Home Screen"/)).toBeInTheDocument();
  });

  it("should show iOS instructions on iPadOS Safari", () => {
    // Mock iPadOS Safari
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
      configurable: true
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true
    });

    render(<InstallBanner />);

    expect(screen.getByText("Pasang Si-Imsak di Home Screen")).toBeInTheDocument();
  });

  it("should show Chromium prompt when beforeinstallprompt fires", () => {
    render(<InstallBanner />);

    // Create and dispatch the event
    const event = new Event('beforeinstallprompt') as any;
    event.prompt = vi.fn();
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(screen.getByText("Pasang Si-Imsak di perangkatmu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pasang" })).toBeInTheDocument();
  });

  it("should handle installation process", async () => {
    render(<InstallBanner />);

    // Create and dispatch the event
    const event = new Event('beforeinstallprompt') as any;
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      window.dispatchEvent(event);
    });

    // Click install button
    const installBtn = screen.getByRole("button", { name: "Pasang" });

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(event.prompt).toHaveBeenCalled();
    // After accepted outcome, the banner should be hidden
    // We can check if the Chromium specific text is no longer present
    expect(screen.queryByText("Pasang Si-Imsak di perangkatmu")).not.toBeInTheDocument();

    // We can also verify the outer wrapper has the hidden classes
    // The install button is also gone
    expect(screen.queryByRole("button", { name: "Pasang" })).not.toBeInTheDocument();
  });

  it("should keep banner if installation is dismissed by user", async () => {
    render(<InstallBanner />);

    // Create and dispatch the event
    const event = new Event('beforeinstallprompt') as any;
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      window.dispatchEvent(event);
    });

    // Click install button
    const installBtn = screen.getByRole("button", { name: "Pasang" });

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(event.prompt).toHaveBeenCalled();
    // Banner should still be visible because outcome was dismissed
    const banner = screen.getByText("Pasang Si-Imsak di perangkatmu").closest('div.relative');
    expect(banner).toHaveClass("max-h-24");
  });

  it("should dismiss banner when close button is clicked", () => {
    // Force iOS mode to easily show the banner
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      configurable: true
    });

    render(<InstallBanner />);

    const closeBtn = screen.getByRole("button", { name: "Tutup" });

    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(localStorage.getItem("pwa-install-dismissed")).toBe("1");

    // After dismiss, the banner should have max-h-0
    const banner = screen.getByRole("button", { name: "Tutup" }).closest('div.relative');
    expect(banner).toHaveClass("max-h-0");
  });
});
