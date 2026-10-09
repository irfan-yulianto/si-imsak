import { describe, it, expect, vi, afterEach } from "vitest";
import { reportClientError } from "./report-error";

afterEach(() => {
  delete (window as unknown as { clarity?: unknown }).clarity;
});

describe("reportClientError", () => {
  it("logs the digest and tags the Clarity session", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const clarity = vi.fn();
    (window as unknown as { clarity: unknown }).clarity = clarity;

    reportClientError(Object.assign(new Error("boom"), { digest: "abc123" }));

    expect(error.mock.calls[0][0]).toContain("digest abc123");
    expect(clarity).toHaveBeenCalledWith("set", "error_digest", "abc123");
    expect(clarity).toHaveBeenCalledWith("event", "app_error");
  });

  it("works without Clarity and never throws because of it", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => reportClientError(new Error("no clarity"))).not.toThrow();

    (window as unknown as { clarity: unknown }).clarity = () => {
      throw new Error("analytics down");
    };
    expect(() => reportClientError(new Error("broken clarity"))).not.toThrow();
  });
});
