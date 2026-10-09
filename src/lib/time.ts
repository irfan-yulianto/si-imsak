import { parseServerTime } from "@/lib/validate";
import { KEYS, read, write } from "@/lib/storage";

const OFFSET_MAX_AGE = 3_600_000; // re-measured at least hourly
const isOffset = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function cacheOffset(offset: number) {
  write(KEYS.timeOffset, offset, { where: "session" });
}

/**
 * Sync with the app server's clock (/api/time) to avoid relying on the device clock.
 * Returns the offset in milliseconds (serverTime - clientTime).
 *
 * A cached offset (valid for 1 hour) is returned immediately for instant startup;
 * the fresh offset from the background refresh is passed to `onRefresh`.
 */
export async function syncServerTime(onRefresh?: (offset: number) => void): Promise<number> {
  const cached = read(KEYS.timeOffset, isOffset, OFFSET_MAX_AGE, "session");
  if (cached !== null) {
    fetchServerTimeOffset()
      .then((fresh) => {
        if (fresh !== null) onRefresh?.(fresh);
      })
      .catch((e) => {
        console.warn("Background server time fetch failed", e);
      });
    return cached;
  }
  return (await fetchServerTimeOffset()) ?? 0;
}

/** Returns the clock offset, or null when the server could not be reached. */
async function fetchServerTimeOffset(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const before = Date.now();
    const res = await fetch("/api/time", { signal: controller.signal, cache: "no-store" });
    const after = Date.now();

    if (!res.ok) return null;

    const serverTime = parseServerTime(await res.json());
    if (serverTime === null) return null;
    // NTP-style: assume the server read its clock halfway through the round trip
    const latency = (after - before) / 2;
    const offset = serverTime + latency - after;

    cacheOffset(offset);
    return offset;
  } catch (e) {
    console.warn("Failed to fetch server time offset", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
