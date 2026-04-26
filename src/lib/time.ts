import { REQUEST_TIMEOUT } from "@/lib/constants";

/**
 * Sync time with worldtimeapi.org to avoid relying on user's device clock.
 * Returns the offset in milliseconds (serverTime - clientTime).
 * Note: the timezone parameter (Asia/Jakarta) doesn't affect the offset —
 * the API returns an ISO 8601 datetime parsed to an absolute UTC timestamp,
 * so the drift calculation is timezone-independent.
 */
export async function syncServerTime(): Promise<number> {
  // Use cached offset for instant startup (valid for 1 hour)
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("timeOffset");
      if (cached) {
        const { offset, ts } = JSON.parse(cached);
        if (typeof offset === "number" && Date.now() - ts < 3600000) {
          // Refresh in background
          fetchServerTimeOffset().then((o) => {
            try {
              sessionStorage.setItem("timeOffset", JSON.stringify({ offset: o, ts: Date.now() }));
            } catch (e) {
              console.warn("Failed to write timeOffset in sessionStorage", e);
            }
          }).catch((e) => {
            console.warn("Background server time fetch failed", e);
          });
          return offset;
        }
      }
    } catch (e) {
      console.warn("Failed to read timeOffset from sessionStorage", e);
    }
  }
  return fetchServerTimeOffset();
}

async function fetchServerTimeOffset(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const before = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Jakarta", {
      signal: controller.signal,
    });
    const after = Date.now();

    if (!res.ok) return 0;

    const data = await res.json();
    const serverTime = new Date(data.datetime).getTime();
    if (isNaN(serverTime)) return 0;
    const latency = (after - before) / 2;
    const offset = serverTime + latency - after;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("timeOffset", JSON.stringify({ offset, ts: Date.now() }));
      } catch (e) {
        console.warn("Failed to write timeOffset in sessionStorage", e);
      }
    }
    return offset;
  } catch (e) {
    console.warn("Failed to fetch server time offset", e);
    return 0;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get current time adjusted by server offset
 */
export function getAdjustedTime(offset: number): Date {
  return new Date(Date.now() + offset);
}

/**
 * Parse a time string (HH:MM) and a date string (YYYY-MM-DD) into a Date object
 */
export function parseScheduleTime(
  dateStr: string,
  timeStr: string,
  utcOffset: number // 7 for WIB, 8 for WITA, 9 for WIT
): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(dateStr);
  // Set time in UTC, then subtract the timezone offset to get the correct UTC time
  date.setUTCHours(hours - utcOffset, minutes, 0, 0);
  return date;
}
