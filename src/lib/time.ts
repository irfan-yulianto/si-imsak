function cacheOffset(offset: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("timeOffset", JSON.stringify({ offset, ts: Date.now() }));
  } catch (e) {
    console.warn("Failed to write timeOffset in sessionStorage", e);
  }
}

/**
 * Sync with the app server's clock (/api/time) to avoid relying on the device clock.
 * Returns the offset in milliseconds (serverTime - clientTime).
 *
 * A cached offset (valid for 1 hour) is returned immediately for instant startup;
 * the fresh offset from the background refresh is passed to `onRefresh`.
 */
export async function syncServerTime(onRefresh?: (offset: number) => void): Promise<number> {
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("timeOffset");
      if (cached) {
        const { offset, ts } = JSON.parse(cached);
        if (typeof offset === "number" && Date.now() - ts < 3600000) {
          fetchServerTimeOffset()
            .then((fresh) => {
              if (fresh !== null) onRefresh?.(fresh);
            })
            .catch((e) => {
              console.warn("Background server time fetch failed", e);
            });
          return offset;
        }
      }
    } catch (e) {
      console.warn("Failed to read timeOffset from sessionStorage", e);
    }
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

    const data = await res.json();
    const serverTime = Number(data.now);
    if (!Number.isFinite(serverTime)) return null;
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
