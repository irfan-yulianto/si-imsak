// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// public/sw.js runs as-is, with a fake worker scope, Cache Storage and fetch
const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
const ORIGIN = "https://si-imsak.test";
const PAGES = "si-imsak-pages-v2";
const STATIC = "si-imsak-static-v2";
const API = "si-imsak-api";
const DAY = 24 * 60 * 60 * 1000;

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}
type Key = string | FakeRequest;
type Listener = (event: unknown) => void;
type Fetch = (input: Key) => Promise<Response>;

const keyOf = (input: Key) => (typeof input === "string" ? new URL(input, ORIGIN).href : input.url);

class FakeCache {
  // Insertion order, like the real thing: put() moves an entry to the end
  entries = new Map<string, Response>();
  constructor(private fetch: Fetch) {}
  async match(input: Key) {
    return this.entries.get(keyOf(input))?.clone();
  }
  async put(input: Key, response: Response) {
    const key = keyOf(input);
    this.entries.delete(key);
    this.entries.set(key, response);
  }
  async delete(input: Key) {
    return this.entries.delete(keyOf(input));
  }
  async keys() {
    return [...this.entries.keys()].map((url) => ({ url, method: "GET", mode: "cors" }));
  }
  async addAll(urls: string[]) {
    for (const url of urls) await this.put(url, await this.fetch(url));
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();
  constructor(private fetch: Fetch) {}
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache(this.fetch));
    return this.stores.get(name)!;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
}

function loadWorker({ navigationPreload = true } = {}) {
  const listeners = new Map<string, Listener>();
  const fetch = vi.fn<Fetch>();
  const caches = new FakeCaches(fetch);
  const enablePreload = vi.fn(() => Promise.resolve());
  const scope = {
    location: new URL(`${ORIGIN}/sw.js?v=v2`),
    registration: navigationPreload ? { navigationPreload: { enable: enablePreload } } : {},
    clients: { claim: vi.fn(() => Promise.resolve()) },
    skipWaiting: vi.fn(),
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  };
  new Function("self", "caches", "fetch", SOURCE)(scope, caches, fetch);
  return { scope, caches, fetch, listeners, enablePreload };
}
type Worker = ReturnType<typeof loadWorker>;

/** Dispatch a fetch event; `response` is undefined when the worker leaves it to the network */
function dispatchFetch(worker: Worker, request: FakeRequest, preloadResponse?: Promise<Response | undefined>) {
  let response: Promise<Response> | undefined;
  const pending: Promise<unknown>[] = [];
  worker.listeners.get("fetch")!({
    request,
    preloadResponse: preloadResponse ?? Promise.resolve(undefined),
    respondWith: (answer: Promise<Response>) => (response = Promise.resolve(answer)),
    waitUntil: (work: Promise<unknown>) => pending.push(work),
  });
  return { response, done: () => Promise.all(pending) };
}

async function activate(worker: Worker) {
  const pending: Promise<unknown>[] = [];
  worker.listeners.get("activate")!({ waitUntil: (work: Promise<unknown>) => pending.push(work) });
  await Promise.all(pending);
}

const navigation = (path: string): FakeRequest => ({ url: ORIGIN + path, method: "GET", mode: "navigate" });
const get = (path: string): FakeRequest => ({ url: ORIGIN + path, method: "GET", mode: "cors" });
const page = (text: string, status = 200) => new Response(text, { status, headers: { "Content-Type": "text/html" } });
const json = (body: unknown, { status = 200, cacheControl = "public, s-maxage=86400" } = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
  });
const schedule = (month: number) => `/api/schedule?city_id=abc&year=2026&month=${month}`;

async function cachedText(worker: Worker, cacheName: string, key: Key) {
  const copy = await (await worker.caches.open(cacheName)).match(key);
  return copy ? copy.text() : undefined;
}

async function seed(worker: Worker, cacheName: string, key: Key, response: Response) {
  await (await worker.caches.open(cacheName)).put(key, response);
}

/** A schedule copy as the worker stores it, `ageMs` old */
function storedSchedule(text: string, ageMs: number) {
  return new Response(text, { headers: { "sw-cached-at": String(Date.now() - ageMs) } });
}

/** A fetch that answers only when told to */
function pendingFetch(worker: Worker) {
  let answer!: (response: Response) => void;
  worker.fetch.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));
  return (response: Response) => answer(response);
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-09T03:00:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("service worker: navigations", () => {
  it("answers from the network and keeps a copy per path", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValue(page("fresh"));

    const { response, done } = dispatchFetch(worker, navigation("/?tab=masjid"));
    expect(await (await response)!.text()).toBe("fresh");
    await done();
    expect(await cachedText(worker, PAGES, `${ORIGIN}/`)).toBe("fresh");
  });

  it("uses the navigation preload answer instead of fetching again", async () => {
    const worker = loadWorker();
    const { response } = dispatchFetch(worker, navigation("/"), Promise.resolve(page("preloaded")));
    expect(await (await response)!.text()).toBe("preloaded");
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it("falls back to the cached page, then to the app shell, when offline", async () => {
    const worker = loadWorker();
    worker.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await seed(worker, PAGES, `${ORIGIN}/`, page("shell"));

    expect(await (await dispatchFetch(worker, navigation("/")).response)!.text()).toBe("shell");
    // A path without its own copy gets the app shell
    expect(await (await dispatchFetch(worker, navigation("/lainnya")).response)!.text()).toBe("shell");
  });

  it("serves the cached copy instead of a server error", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValue(page("down", 503));
    await seed(worker, PAGES, `${ORIGIN}/`, page("cached"));

    expect(await (await dispatchFetch(worker, navigation("/")).response)!.text()).toBe("cached");
    // Without a copy, the error is passed on
    const other = await dispatchFetch(worker, navigation("/lainnya")).response;
    expect(other!.status).toBe(503);
  });

  it("answers from the cache after 3.5 s of waiting, and stores the late answer", async () => {
    const worker = loadWorker();
    await seed(worker, PAGES, `${ORIGIN}/`, page("cached"));
    const answer = pendingFetch(worker);

    const { response, done } = dispatchFetch(worker, navigation("/"));
    let answered = false;
    void response!.then(() => (answered = true));
    await vi.advanceTimersByTimeAsync(3_499);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await (await response)!.text()).toBe("cached");

    answer(page("late"));
    await done();
    expect(await cachedText(worker, PAGES, `${ORIGIN}/`)).toBe("late");
  });

  it("keeps waiting for a slow network when nothing is cached", async () => {
    const worker = loadWorker();
    const answer = pendingFetch(worker);

    const { response } = dispatchFetch(worker, navigation("/"));
    let answered = false;
    void response!.then(() => (answered = true));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(answered).toBe(false);

    answer(page("slow"));
    expect(await (await response)!.text()).toBe("slow");
  });
});

describe("service worker: schedule", () => {
  it("keeps a dated copy of a full month, but not of a partial one", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValueOnce(json({ status: true, month: 10 }));
    worker.fetch.mockResolvedValueOnce(json({ status: true, partial: true }, { cacheControl: "no-store" }));

    const full = dispatchFetch(worker, get(schedule(10)));
    expect(await (await full.response)!.json()).toEqual({ status: true, month: 10 });
    await full.done();
    const partial = dispatchFetch(worker, get(schedule(11)));
    expect((await partial.response)!.status).toBe(200);
    await partial.done();

    const copy = await (await worker.caches.open(API)).match(get(schedule(10)));
    expect(copy!.headers.get("sw-cached-at")).toBe(String(Date.now()));
    expect(await cachedText(worker, API, get(schedule(11)))).toBeUndefined();
  });

  it("serves a copy up to 7 days old when offline, and drops older ones", async () => {
    const worker = loadWorker();
    worker.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await seed(worker, API, get(schedule(10)), storedSchedule("recent", 6 * DAY));
    await seed(worker, API, get(schedule(9)), storedSchedule("old", 8 * DAY));

    expect(await (await dispatchFetch(worker, get(schedule(10))).response)!.text()).toBe("recent");

    const expired = (await dispatchFetch(worker, get(schedule(9))).response)!;
    expect(expired.status).toBe(503);
    expect(await expired.json()).toEqual({ status: false, error: "Offline" });
    expect(await cachedText(worker, API, get(schedule(9)))).toBeUndefined();
  });

  it("serves the copy when the server answers 502", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValue(json({ status: false }, { status: 502, cacheControl: "public, s-maxage=30" }));
    await seed(worker, API, get(schedule(10)), storedSchedule("cached", DAY));

    expect(await (await dispatchFetch(worker, get(schedule(10))).response)!.text()).toBe("cached");
  });

  it("serves the copy after 3.5 s of waiting", async () => {
    const worker = loadWorker();
    await seed(worker, API, get(schedule(10)), storedSchedule("cached", DAY));
    pendingFetch(worker);

    const { response } = dispatchFetch(worker, get(schedule(10)));
    await vi.advanceTimersByTimeAsync(3_500);
    expect(await (await response)!.text()).toBe("cached");
  });

  it("keeps at most 48 months, dropping the oldest", async () => {
    const worker = loadWorker();
    worker.fetch.mockImplementation(async () => json({ status: true }));
    for (let i = 0; i < 50; i++) {
      await dispatchFetch(worker, get(`/api/schedule?city_id=c${i}&year=2026&month=10`)).done();
    }
    const urls = [...(await worker.caches.open(API)).entries.keys()];
    expect(urls).toHaveLength(48);
    expect(urls[0]).toContain("city_id=c2&");
  });
});

describe("service worker: other requests", () => {
  it("serves static build files from the cache first", async () => {
    const worker = loadWorker();
    worker.fetch.mockResolvedValue(new Response("chunk"));
    const chunk = get("/_next/static/chunks/app.js");

    expect(await (await dispatchFetch(worker, chunk).response)!.text()).toBe("chunk");
    expect(await (await dispatchFetch(worker, chunk).response)!.text()).toBe("chunk");
    expect(worker.fetch).toHaveBeenCalledTimes(1);
    expect(await cachedText(worker, STATIC, chunk)).toBe("chunk");
  });

  it("leaves other API routes, other sites and non-GET requests to the browser", () => {
    const worker = loadWorker();
    expect(dispatchFetch(worker, get("/api/cities?q=ban")).response).toBeUndefined();
    expect(dispatchFetch(worker, { url: "https://www.clarity.ms/tag/x", method: "GET", mode: "no-cors" }).response).toBeUndefined();
    expect(dispatchFetch(worker, { ...get(schedule(10)), method: "POST" }).response).toBeUndefined();
  });

  it("switches to a waiting version only when the page asks", () => {
    const worker = loadWorker();
    worker.listeners.get("message")!({ data: { type: "OTHER" } });
    expect(worker.scope.skipWaiting).not.toHaveBeenCalled();
    worker.listeners.get("message")!({ data: { type: "SKIP_WAITING" } });
    expect(worker.scope.skipWaiting).toHaveBeenCalled();
  });
});

describe("service worker: lifecycle", () => {
  it("caches the app shell on install", async () => {
    const worker = loadWorker();
    worker.fetch.mockImplementation(async (input) => new Response(`shell ${String(input)}`));
    const pending: Promise<unknown>[] = [];
    worker.listeners.get("install")!({ waitUntil: (work: Promise<unknown>) => pending.push(work) });
    await Promise.all(pending);

    expect(await cachedText(worker, PAGES, "/")).toBe("shell /");
    expect(await cachedText(worker, PAGES, "/manifest.webmanifest")).toBe("shell /manifest.webmanifest");
  });

  it("on activate: enables navigation preload, drops old versions and expired copies, takes control", async () => {
    const worker = loadWorker();
    await worker.caches.open("si-imsak-pages-v1");
    await worker.caches.open("si-imsak-static-v1");
    await worker.caches.open("another-app");
    await seed(worker, API, get(schedule(10)), storedSchedule("recent", DAY));
    await seed(worker, API, get(schedule(1)), storedSchedule("expired", 8 * DAY));

    await activate(worker);

    expect(worker.enablePreload).toHaveBeenCalled();
    expect(await worker.caches.keys()).toEqual(["another-app", API]);
    expect(await cachedText(worker, API, get(schedule(10)))).toBe("recent");
    expect(await cachedText(worker, API, get(schedule(1)))).toBeUndefined();
    expect(worker.scope.clients.claim).toHaveBeenCalled();
  });

  it("activates in browsers without navigation preload", async () => {
    const worker = loadWorker({ navigationPreload: false });
    await activate(worker);
    expect(worker.scope.clients.claim).toHaveBeenCalled();
  });
});
