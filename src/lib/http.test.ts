// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { createGate, json, tooManyRequests, upstreamFetch } from "./http";

afterEach(() => {
  vi.useRealTimers();
});

describe("json", () => {
  it("answers with the body, status and Cache-Control given", async () => {
    const res = json({ status: true }, { status: 201, cache: "no-store", headers: { "X-Test": "1" } });
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Test")).toBe("1");
    expect(await res.json()).toEqual({ status: true });
  });

  it("leaves Cache-Control out when none is given", () => {
    expect(json({}).headers.get("Cache-Control")).toBeNull();
  });
});

describe("tooManyRequests", () => {
  it("is an uncached 429 with Retry-After", () => {
    const res = tooManyRequests({ status: false }, 12);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("upstreamFetch", () => {
  it("asks without the data cache, with our User-Agent and a time limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await upstreamFetch("https://upstream.test/x", { timeoutMs: 1000, headers: { "X-Extra": "1" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://upstream.test/x");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({ "User-Agent": expect.stringMatching(/^Si-Imsak\//), Accept: "application/json", "X-Extra": "1" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("is cancelled with the caller's signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const caller = new AbortController();
    await upstreamFetch("https://upstream.test/x", { timeoutMs: 60_000, signal: caller.signal });
    caller.abort();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});

describe("createGate", () => {
  it("lets calls through one interval apart", async () => {
    vi.useFakeTimers();
    const wait = createGate(1000);
    const passed: number[] = [];
    const start = Date.now();
    for (let i = 0; i < 3; i++) wait().then(() => passed.push(Date.now() - start));

    await vi.advanceTimersByTimeAsync(0);
    expect(passed).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(passed).toEqual([0, 1000]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(passed).toEqual([0, 1000, 2000]);
    // After a quiet second, the next call goes straight through
    await vi.advanceTimersByTimeAsync(1000);
    await wait();
    expect(Date.now() - start).toBe(3000);
  });

  it("stops waiting when the caller gives up", async () => {
    vi.useFakeTimers();
    const wait = createGate(1000);
    await wait();
    const caller = new AbortController();
    const waiting = wait(caller.signal);
    caller.abort(new Error("gone"));
    await expect(waiting).rejects.toThrow("gone");
  });
});
