import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { describe, it, expect, vi, afterEach } from "vitest";
import CurrentYear from "./CurrentYear";
import { BUILD_DATE } from "@/lib/city-time";

describe("CurrentYear", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the build year on the server", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.UTC(BUILD_DATE.year + 3, 5, 1)));
    expect(renderToString(<CurrentYear />)).toBe(String(BUILD_DATE.year));
  });

  it("hydrates without a mismatch, then shows the current year in WIB", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 31 December 18:00 UTC is already 1 January in WIB
    vi.setSystemTime(new Date(`${BUILD_DATE.year}-12-31T18:00:00Z`));
    const container = document.createElement("div");
    container.innerHTML = renderToString(<CurrentYear />);

    const onRecoverableError = vi.fn();
    await act(async () => {
      hydrateRoot(container, <CurrentYear />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe(String(BUILD_DATE.year + 1));
  });
});
