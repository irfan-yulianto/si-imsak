import {
  CDN_CACHE_DAY,
  MYQURAN_API_BASE,
  NO_STORE,
  UPSTREAM_USER_AGENT,
  getScheduleYearRange,
} from "@/lib/constants";
import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { PRAYER_KEYS, type ScheduleDay } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// The whole request, including retries, finishes within DEADLINE_MS
export const maxDuration = 10;

const DEADLINE_MS = 8_000;
const CALL_TIMEOUT_MS = 2_500;
const RETRY_PAUSE_MS = 200;
const DAY_CONCURRENCY = 6;
// After upstream was found down, answer straight away for this long instead of piling on
const BREAKER_MS = 15_000;
const RETRY_AFTER_S = 30;
const UNAVAILABLE_CACHE = "public, s-maxage=30";
const NOT_FOUND_CACHE = "public, s-maxage=300";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Get number of days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Format date as YYYY-MM-DD
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Run promises with a maximum concurrency cap.
 * Prevents hammering the upstream API with 31 simultaneous requests
 * while still being much faster than fully sequential fetching.
 */
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

interface UpstreamData {
  kabko?: unknown;
  prov?: unknown;
  jadwal: Record<string, unknown>;
}

/**
 * What one upstream call came back with:
 * - ok: data for the period (individual days are validated separately)
 * - empty: a 200 without data (unknown city, or a day upstream doesn't have)
 * - client: a 4xx other than 429 — e.g. a period format upstream doesn't support
 * - unavailable: 5xx, 429, timeout, network error or a body that isn't JSON
 */
type Outcome =
  | { kind: "ok"; data: UpstreamData }
  | { kind: "empty" | "client" | "unavailable" };

interface RequestLog {
  route: "schedule";
  city: string;
  month: string;
  monthly: string;
  calls: number;
  days: number;
  of: number;
  status: number;
  ms: number;
}

// Per instance: set when a request found upstream down
let breakerOpenUntil = 0;

async function fetchPeriod(
  cityId: string,
  period: string,
  deadline: AbortSignal,
  log: RequestLog
): Promise<Outcome> {
  if (deadline.aborted) return { kind: "unavailable" };
  log.calls++;
  try {
    // No Next.js data cache: a cached `{status:false}` body would outlive an upstream
    // hiccup by a day. The CDN caches our own response instead.
    const res = await fetch(`${MYQURAN_API_BASE}/jadwal/${cityId}/${period}`, {
      cache: "no-store",
      headers: { "User-Agent": UPSTREAM_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.any([deadline, AbortSignal.timeout(CALL_TIMEOUT_MS)]),
    });
    if (res.status === 429 || res.status >= 500) return { kind: "unavailable" };
    if (!res.ok) return { kind: "client" };
    const body = await res.json();
    const data = body?.status ? body.data : null;
    if (data?.jadwal && typeof data.jadwal === "object") return { kind: "ok", data };
    return { kind: "empty" };
  } catch {
    return { kind: "unavailable" };
  }
}

/** fetchPeriod with one more try after a transient failure, if time allows */
async function fetchPeriodRetrying(
  cityId: string,
  period: string,
  deadline: AbortSignal,
  log: RequestLog
): Promise<Outcome> {
  const first = await fetchPeriod(cityId, period, deadline, log);
  if (first.kind !== "unavailable" || deadline.aborted) return first;
  await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
  return fetchPeriod(cityId, period, deadline, log);
}

/** An upstream day with all eight times as HH:MM, in our format — or null */
function toScheduleDay(date: string, raw: unknown): ScheduleDay | null {
  if (!raw || typeof raw !== "object") return null;
  const day = raw as Record<string, unknown>;
  if (typeof day.tanggal !== "string" || !day.tanggal) return null;
  const times = {} as Record<(typeof PRAYER_KEYS)[number], string>;
  for (const key of PRAYER_KEYS) {
    const value = day[key];
    if (typeof value !== "string" || !HHMM.test(value)) return null;
    times[key] = value;
  }
  return { tanggal: day.tanggal, date, ...times };
}

function unavailable(retryAfterS: number) {
  return NextResponse.json(
    { status: false, error: "Upstream unavailable" },
    {
      status: 502,
      headers: { "Retry-After": String(Math.max(1, retryAfterS)), "Cache-Control": UNAVAILABLE_CACHE },
    }
  );
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  const ip = extractClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { status: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  const cityId = request.nextUrl.searchParams.get("city_id");
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");

  if (!cityId || !year || !month) {
    return NextResponse.json(
      { status: false, error: "Missing parameters" },
      { status: 400 }
    );
  }

  // Validate city_id: MD5 hash (32 hex chars)
  if (!/^[a-f0-9]{32}$/.test(cityId)) {
    return NextResponse.json(
      { status: false, error: "Invalid city_id" },
      { status: 400 }
    );
  }

  // Validate year and month
  const yearNum = Number(year);
  const monthNum = Number(month);
  const yearRange = getScheduleYearRange();
  if (!Number.isInteger(yearNum) || yearNum < yearRange.min || yearNum > yearRange.max) {
    return NextResponse.json(
      { status: false, error: "Invalid year" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return NextResponse.json(
      { status: false, error: "Invalid month" },
      { status: 400 }
    );
  }

  const monthPeriod = `${yearNum}-${String(monthNum).padStart(2, "0")}`;
  const dates = Array.from({ length: getDaysInMonth(yearNum, monthNum) }, (_, i) =>
    formatDate(yearNum, monthNum, i + 1)
  );
  const log: RequestLog = {
    route: "schedule", city: cityId, month: monthPeriod, monthly: "", calls: 0,
    days: 0, of: dates.length, status: 0, ms: 0,
  };
  // One structured line per request — searchable in the Vercel logs
  const finish = (res: NextResponse) => {
    log.status = res.status;
    log.ms = Date.now() - started;
    console.log(JSON.stringify(log));
    return res;
  };

  if (Date.now() < breakerOpenUntil) {
    log.monthly = "breaker";
    return finish(unavailable(Math.ceil((breakerOpenUntil - Date.now()) / 1000)));
  }

  try {
    const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(DEADLINE_MS)]);
    const days = new Map<string, ScheduleDay>();
    let meta: UpstreamData | undefined;
    const take = (outcome: Outcome, wanted: string[]) => {
      if (outcome.kind !== "ok") return;
      for (const date of wanted) {
        const day = toScheduleDay(date, outcome.data.jadwal[date]);
        if (day) days.set(date, day);
      }
      meta ??= outcome.data;
    };
    const missingDates = () => dates.filter((date) => !days.has(date));

    // The whole month in one upstream call
    const monthly = await fetchPeriodRetrying(cityId, monthPeriod, deadline, log);
    take(monthly, dates);
    log.monthly = monthly.kind === "ok" ? (days.size === dates.length ? "ok" : "incomplete") : monthly.kind;

    if (days.size === 0) {
      // Nothing usable for the month: check that upstream answers for a single day
      // before asking it for every day of the month
      const probeDate = dates[0];
      const probe = await fetchPeriod(cityId, probeDate, deadline, log);
      take(probe, [probeDate]);
      if (probe.kind === "unavailable") {
        // A visitor who gave up waiting says nothing about upstream
        if (!request.signal.aborted) breakerOpenUntil = Date.now() + BREAKER_MS;
        return finish(unavailable(RETRY_AFTER_S));
      }
      if (days.size === 0) {
        // A 200 with malformed times is upstream's fault; no data at all means this
        // city has no schedule
        return finish(
          probe.kind === "ok"
            ? NextResponse.json(
                { status: false, error: "Upstream API error" },
                { status: 502, headers: { "Cache-Control": NO_STORE } }
              )
            : NextResponse.json(
                { status: false, error: "Schedule not found" },
                { status: 404, headers: { "Cache-Control": NOT_FOUND_CACHE } }
              )
        );
      }
    }

    // Fill the gaps day by day, as far as the deadline allows
    const missing = missingDates();
    if (missing.length > 0) {
      await withConcurrency(
        missing.map((date) => async () => {
          take(await fetchPeriodRetrying(cityId, date, deadline, log), [date]);
        }),
        DAY_CONCURRENCY
      );
    }

    const jadwal = dates.flatMap((date) => days.get(date) ?? []);
    log.days = jadwal.length;
    // A month with gaps must not be cached (CDN, service worker or localStorage),
    // otherwise the gaps stick around long after upstream recovers.
    const partial = jadwal.length < dates.length;

    return finish(
      NextResponse.json(
        {
          status: true,
          ...(partial && { partial: true }),
          data: {
            id: cityId,
            lokasi: typeof meta?.kabko === "string" ? meta.kabko : "",
            daerah: typeof meta?.prov === "string" ? meta.prov : "",
            jadwal,
          },
        },
        { headers: { "Cache-Control": partial ? NO_STORE : CDN_CACHE_DAY } }
      )
    );
  } catch (err) {
    console.error("[schedule] Failed:", err instanceof Error ? err.message : err);
    return finish(
      NextResponse.json(
        { status: false, error: "Failed to fetch schedule" },
        { status: 500, headers: { "Cache-Control": NO_STORE } }
      )
    );
  }
}
