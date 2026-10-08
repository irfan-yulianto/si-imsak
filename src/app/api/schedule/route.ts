import { CDN_CACHE_DAY, MYQURAN_API_BASE, NO_STORE, getScheduleYearRange } from "@/lib/constants";
import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Get number of days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
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

interface UpstreamDay {
  tanggal: string; imsak: string; subuh: string;
  terbit: string; dhuha: string; dzuhur: string;
  ashar: string; maghrib: string; isya: string;
}

interface UpstreamResponse {
  status: boolean;
  data?: {
    kabko: string;
    prov: string;
    jadwal: Record<string, UpstreamDay>;
  };
}

/**
 * Fetch one upstream period (a day "YYYY-MM-DD" or a month "YYYY-MM") with retry
 * and per-request timeout. Returns null when the upstream has no usable data.
 * 4xx responses are not retried — they won't succeed on a second attempt.
 */
async function fetchPeriod(cityId: string, period: string, retries: number): Promise<UpstreamResponse | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${MYQURAN_API_BASE}/jadwal/${cityId}/${period}`, {
        next: { revalidate: 86400 },
        signal: controller.signal,
      });
      if (res.ok) {
        const data: UpstreamResponse = await res.json();
        if (data?.status && data.data?.jadwal) return data;
      } else if (res.status >= 400 && res.status < 500) {
        return null;
      }
    } catch {
      // retry on timeout, network error or malformed JSON
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
  }
  return null;
}

export async function GET(request: NextRequest) {
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

  try {
    const daysInMonth = getDaysInMonth(yearNum, monthNum);
    const dates = Array.from({ length: daysInMonth }, (_, i) =>
      formatDate(yearNum, monthNum, i + 1)
    );

    // Try the whole month in one upstream call first; fill any missing days per-day.
    const monthPeriod = `${yearNum}-${String(monthNum).padStart(2, "0")}`;
    const monthly = await fetchPeriod(cityId, monthPeriod, 1);

    const days: Record<string, UpstreamDay> = { ...monthly?.data?.jadwal };
    let meta = monthly?.data;

    const missing = dates.filter((date) => !days[date]);
    if (missing.length > 0) {
      // Concurrency 10: fast enough (~3 waves for a full month) without hammering upstream.
      const tasks = missing.map((date) => () => fetchPeriod(cityId, date, 2));
      const responses = await withConcurrency(tasks, 10);
      responses.forEach((res, i) => {
        const day = res?.data?.jadwal?.[missing[i]];
        if (day) days[missing[i]] = day;
        if (!meta && res?.data) meta = res.data;
      });
    }

    // Transform v3 responses to v2-compatible format
    const jadwal = dates
      .map((date) => {
        const day = days[date];
        if (!day?.tanggal || !day.imsak || !day.subuh) return null;
        return {
          tanggal: day.tanggal,
          date,
          imsak: day.imsak,
          subuh: day.subuh,
          terbit: day.terbit,
          dhuha: day.dhuha,
          dzuhur: day.dzuhur,
          ashar: day.ashar,
          maghrib: day.maghrib,
          isya: day.isya,
        };
      })
      .filter(Boolean);

    if (!meta || jadwal.length === 0) {
      return NextResponse.json(
        { status: false, error: "Upstream API error" },
        { status: 502, headers: { "Cache-Control": NO_STORE } }
      );
    }

    // A month with gaps must not be cached (CDN, service worker or localStorage),
    // otherwise the gaps stick around long after upstream recovers.
    const partial = jadwal.length < dates.length;

    return NextResponse.json(
      {
        status: true,
        ...(partial && { partial: true }),
        data: {
          id: cityId,
          lokasi: meta.kabko,
          daerah: meta.prov,
          jadwal,
        },
      },
      { headers: { "Cache-Control": partial ? NO_STORE : CDN_CACHE_DAY } }
    );
  } catch (err) {
    console.error("[schedule] Failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: false, error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
