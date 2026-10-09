// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { log, errorMessage } from "./log";

describe("log", () => {
  it("writes one JSON line with level, time and version", () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", { route: "schedule", calls: 1 });
    expect(out).toHaveBeenCalledTimes(1);
    const line = JSON.parse(out.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "info", route: "schedule", calls: 1 });
    expect(new Date(line.ts).toString()).not.toBe("Invalid Date");
    expect(typeof line.version).toBe("string");
  });

  it("sends warnings and errors to the matching console stream", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    log("warn", { a: 1 });
    log("error", { b: 2 });
    expect(JSON.parse(warn.mock.calls[0][0] as string).level).toBe("warn");
    expect(JSON.parse(error.mock.calls[0][0] as string).level).toBe("error");
  });

  it("reduces thrown values to a message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });
});
