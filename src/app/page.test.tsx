import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/components/layout/Header", () => ({ default: () => <header>header</header> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer>footer</footer> }));
vi.mock("@/components/schedule/CountdownTimer", () => ({ default: () => <div>countdown</div> }));
vi.mock("@/components/schedule/TodayCard", () => ({ default: () => <div>today</div> }));
vi.mock("@/components/schedule/ScheduleTable", () => ({ default: () => <div>table</div> }));
vi.mock("@/components/pwa/InstallBanner", () => ({ default: () => null }));
vi.mock("@/components/pwa/UpdateToast", () => ({ default: () => null }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>mosque finder</div> }));
vi.mock("@/store/useStore", () => ({ useStore: { getState: () => ({ hydrateFromCache: vi.fn() }) } }));

import Home from "./page";

class MockIntersectionObserver {
  observe() {}
  disconnect() {}
}

describe("Home navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    window.history.replaceState(null, "", "/");
    window.scrollTo = vi.fn();
  });

  it("renders mobile tabs with tab semantics", () => {
    render(<Home />);
    const jadwal = screen.getByRole("tab", { name: "Jadwal" });
    const masjid = screen.getByRole("tab", { name: "Masjid" });
    expect(jadwal).toHaveAttribute("aria-selected", "true");
    expect(jadwal).toHaveAttribute("aria-controls", "panel-jadwal");
    expect(masjid).toHaveAttribute("aria-selected", "false");
    expect(masjid).toHaveAttribute("tabindex", "-1");
  });

  it("stores the selected tab in the URL", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("tab", { name: "Masjid" }));
    expect(window.location.search).toBe("?tab=masjid");
    expect(screen.getByRole("tab", { name: "Masjid" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Jadwal" }));
    expect(window.location.search).toBe("");
  });

  it("opens the tab named in the URL and follows the back button", () => {
    window.history.replaceState(null, "", "/?tab=masjid");
    render(<Home />);
    expect(screen.getByRole("tab", { name: "Masjid" })).toHaveAttribute("aria-selected", "true");

    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("tab", { name: "Jadwal" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves between tabs with the arrow keys", () => {
    render(<Home />);
    const jadwal = screen.getByRole("tab", { name: "Jadwal" });
    jadwal.focus();
    fireEvent.keyDown(jadwal, { key: "ArrowRight" });
    const masjid = screen.getByRole("tab", { name: "Masjid" });
    expect(masjid).toHaveAttribute("aria-selected", "true");
    expect(masjid).toHaveFocus();
  });

  it("has a skip link to the main content", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Lewati ke konten" })).toHaveAttribute("href", "#konten");
    expect(document.getElementById("konten")?.tagName).toBe("MAIN");
  });
});
