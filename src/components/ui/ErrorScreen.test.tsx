import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorScreen from "./ErrorScreen";
import { buttonClass } from "./Button";

describe("ErrorScreen", () => {
  it("says something went wrong and retries on request", () => {
    const onRetry = vi.fn();
    render(<ErrorScreen onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Terjadi Kesalahan");
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi memuat halaman" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("looks like a primary Button without importing it", () => {
    render(<ErrorScreen onRetry={() => {}} />);
    expect(screen.getByRole("button").className).toBe(buttonClass("primary", "md"));
  });
});
