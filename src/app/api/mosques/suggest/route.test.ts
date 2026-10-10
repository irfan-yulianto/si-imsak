// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { buildIndex, loadMosqueData } from "@/lib/mosque-index";
import { SUGGESTION_LABEL, parseSuggestionIssue } from "@/lib/mosque-contrib";
import type { DatasetRow } from "@/lib/mosque-tsv";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/mosque-index", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mosque-index")>()),
  loadMosqueData: vi.fn(),
}));

const MONAS = { lat: -6.1754, lng: 106.8272 };
/** The dataset: one mosque 500 m north of Monas */
const rows: DatasetRow[] = [{ id: "n1", lat: MONAS.lat + 500 / 111_195, lng: MONAS.lng, type: "masjid", name: "Masjid Utara" }];
/** What the finder sends from Monas */
const sent = { kind: "musholla", name: "Al-Ikhlas", street: "Gang Damai 3", lat: MONAS.lat, lng: MONAS.lng, accuracy: 12 };

function post(payload: unknown, headers: Record<string, string> = {}) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return new NextRequest("http://localhost/api/mosques/suggest", {
    method: "POST",
    body: raw,
    headers: { "content-type": "application/json", ...headers },
  });
}

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(headers),
  json: () => Promise.resolve(body),
});

const mockFetch = vi.fn();
/** GitHub: the open suggestions it lists, and how it answers the issue created */
function github(open: object[] = [], created: { status?: number; body?: unknown; headers?: Record<string, string> } = {}) {
  mockFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? reply(created.status ?? 201, created.body ?? { number: 12 }, created.headers) : reply(200, open)
  );
}
/** The issue the route created, as GitHub received it */
const createdIssue = () => {
  const call = mockFetch.mock.calls.find(([, init]) => (init as RequestInit)?.method === "POST");
  return call ? { url: call[0] as string, init: call[1] as RequestInit, issue: JSON.parse(call[1].body as string) } : null;
};

beforeEach(async () => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("SUGGESTION_GITHUB_TOKEN", "test-token");
  vi.mocked((await import("@/lib/rate-limit")).checkRateLimit).mockReturnValue({ ok: true });
  vi.mocked(loadMosqueData).mockResolvedValue({ index: buildIndex(rows), dataDate: "2026-10-06" });
  github();
});

describe("POST /api/mosques/suggest", () => {
  it("turns the suggestion into a labelled issue for the owner, and says its number", async () => {
    const res = await POST(post(sent));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ status: true, data: { number: 12 } });

    // The backlog was looked at first
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.github.com/repos/irfan-yulianto/si-imsak/issues?labels=usulan-masjid&state=open&per_page=100");
    const created = createdIssue()!;
    expect(created.url).toBe("https://api.github.com/repos/irfan-yulianto/si-imsak/issues");
    expect(created.init.headers).toMatchObject({ Authorization: "Bearer test-token", "Content-Type": "application/json", "User-Agent": expect.stringMatching(/^Si-Imsak\//) });
    expect(created.init.cache).toBe("no-store");
    expect(created.issue.title).toBe("Usulan: Musholla Al-Ikhlas");
    expect(created.issue.labels).toEqual([SUGGESTION_LABEL]);
    // What the build will read back from it
    expect(parseSuggestionIssue({ number: 12, body: created.issue.body })).toMatchObject({
      number: 12,
      type: "musholla",
      name: "Musholla Al-Ikhlas",
      street: "Gang Damai 3",
      lat: -6.1754,
      lng: 106.8272,
      accuracy: 12,
    });
  });

  it("keeps a name that already starts like a mosque's, and takes the kind from it", async () => {
    await POST(post({ ...sent, kind: "masjid", name: "Surau Nurul Iman", street: undefined }));
    const { issue } = createdIssue()!;
    expect(issue.title).toBe("Usulan: Surau Nurul Iman");
    expect(parseSuggestionIssue({ number: 1, body: issue.body })).toMatchObject({ type: "musholla", name: "Surau Nurul Iman" });
    expect(parseSuggestionIssue({ number: 1, body: issue.body })).not.toHaveProperty("street");
  });

  it("rounds the position to five decimals and the accuracy to whole meters", async () => {
    await POST(post({ ...sent, lat: -6.175412345, lng: 106.827198765, accuracy: 11.6 }));
    expect(parseSuggestionIssue({ number: 1, body: createdIssue()!.issue.body })).toMatchObject({ lat: -6.17541, lng: 106.8272, accuracy: 12 });
  });

  it("takes only the app's own JSON", async () => {
    expect((await POST(post(sent, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(post(sent, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(post(sent, { "sec-fetch-site": "same-origin" }))).status).toBe(200);
    expect((await POST(post("{oops"))).status).toBe(400);
    expect((await POST(post({ ...sent, street: "x".repeat(3000) }))).status).toBe(413);
    expect(createdIssue()?.issue.title).toBe("Usulan: Musholla Al-Ikhlas");
  });

  it.each<[string, object, RegExp]>([
    ["a name with markdown", { name: "Al-Ikhlas | <b>" }, /Periksa lagi isiannya/],
    ["a kind that isn't a mosque's", { kind: "gereja" }, /Periksa lagi isiannya/],
    ["a position outside Indonesia", { lat: 1.35, lng: 103.8 + 50 }, /Periksa lagi isiannya/],
    ["a fix that isn't sharp", { accuracy: 80 }, /belum cukup akurat/],
  ])("refuses %s", async (_what, overrides, message) => {
    const res = await POST(post({ ...sent, ...overrides }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockReturnValue({ ok: false, retryAfterS: 42 });
    const res = await POST(post(sent));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("says when suggestions are off: no token", async () => {
    vi.stubEnv("SUGGESTION_GITHUB_TOKEN", "");
    const res = await POST(post(sent));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: false, error: "Fitur usulan belum aktif di server ini." });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("says when the place is listed already, by its name", async () => {
    const res = await POST(post({ ...sent, lat: rows[0].lat + 20 / 111_195 }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Sudah tercatat: Masjid Utara. Bila datanya keliru, laporkan di OpenStreetMap.");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails closed while the dataset can't be read", async () => {
    vi.mocked(loadMosqueData).mockResolvedValue(null);
    const res = await POST(post(sent));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: false, retryable: true });
  });

  it("takes no more while 50 suggestions await the owner; pull requests in the list don't count", async () => {
    github(Array.from({ length: 50 }, (_, i) => ({ number: i + 1 })));
    const res = await POST(post(sent));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/Antrean usulan sedang penuh/), retryable: true });
    expect(createdIssue()).toBeNull();

    mockFetch.mockClear();
    github(Array.from({ length: 50 }, (_, i) => (i < 10 ? { number: i + 1, pull_request: {} } : { number: i + 1 })));
    expect((await POST(post(sent))).status).toBe(200);
  });

  it.each<[string, { status: number; headers?: Record<string, string> }, number, boolean, string | null]>([
    ["an expired token", { status: 401 }, 503, false, null],
    ["a repository the token can't see", { status: 404 }, 503, false, null],
    ["GitHub's own rate limit", { status: 403, headers: { "retry-after": "30" } }, 503, true, "30"],
    ["an issue GitHub won't take", { status: 422 }, 502, false, null],
    ["a GitHub outage", { status: 500 }, 502, true, null],
  ])("tells the user to come back later on %s, and logs the status", async (_what, created, status, retryable, retryAfter) => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    github([], created);
    const res = await POST(post(sent));
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.status).toBe(false);
    expect(body.retryable ?? false).toBe(retryable);
    expect(res.headers.get("Retry-After")).toBe(retryAfter);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining(`"upstreamStatus":${created.status}`));
  });

  it("gives up when GitHub doesn't answer, without trying the issue again", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("fetch failed"));
    const res = await POST(post(sent));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ retryable: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"route":"suggest"'));
  });

  it("logs the issue's number, never the position or the name", async () => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    await POST(post(sent));
    const line = logs.mock.calls.map((c) => String(c[0])).find((l) => l.includes('"route":"suggest"'))!;
    expect(line).toContain('"number":12');
    expect(line).not.toContain("6.1754");
    expect(line).not.toContain("Ikhlas");
  });
});
