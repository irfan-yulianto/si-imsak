import { monthKey } from "@/lib/city-time";
import { MOSQUE_CACHE_MAX_AGE, SCHEDULE_CACHE_MAX_AGE } from "@/lib/constants";
import { isCityId, isMosqueList, isObject, isScheduleDayList, type ScheduleData } from "@/lib/validate";

// The only module that touches localStorage and sessionStorage (eslint.config.mjs bans
// them elsewhere). Storage can be missing (server render) or throw (Safari private mode,
// blocked site data, a full quota): every function here fails soft, as if the value
// simply wasn't stored.
//
// Caches are kept in an envelope, { v: 1, ts, data }, under "si:" keys, so their age
// is known and they can be swept. A few keys keep their original names and formats:
// the theme (read by the inline script in layout.tsx before React loads), the chosen
// city and the two dismissals, which existing visitors already have.

type Area = "local" | "session";

export const KEYS = {
  theme: "theme",
  location: "selectedLocation",
  locationPromptDismissed: "locationPermissionDismissed",
  installDismissed: "pwa-install-dismissed",
  timeOffset: "si:timeOffset",
  schedule: (cityId: string, year: number, month: number) => `si:schedule:${cityId}:${monthKey(year, month)}`,
  mosques: (lat: number, lng: number, radius: number) => `si:mosques:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`,
} as const;

export const PREFIX = { schedule: "si:schedule:", mosques: "si:mosques:" } as const;

interface Envelope {
  v: 1;
  ts: number;
  data: unknown;
}

function area(which: Area): Storage | null {
  try {
    return typeof window === "undefined" ? null : which === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function parseEnvelope(raw: string | null): Envelope | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) && value.v === 1 && typeof value.ts === "number" && "data" in value
      ? (value as unknown as Envelope)
      : null;
  } catch {
    return null;
  }
}

export function readRaw(key: string, where: Area = "local"): string | null {
  try {
    return area(where)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string, where: Area = "local"): boolean {
  try {
    const storage = area(where);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string, where: Area = "local"): void {
  try {
    area(where)?.removeItem(key);
  } catch {
    // Nothing stored, then
  }
}

/** A plain JSON value (no envelope), if it passes `guard` */
export function readJson<T>(key: string, guard: (value: unknown) => value is T, where: Area = "local"): T | null {
  const raw = readRaw(key, where);
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, where: Area = "local"): boolean {
  return writeRaw(key, JSON.stringify(value), where);
}

/**
 * A cached value, if it passes `guard` and is younger than `maxAgeMs`. Expired or
 * malformed entries are removed.
 */
export function read<T>(
  key: string,
  guard: (value: unknown) => value is T,
  maxAgeMs: number,
  where: Area = "local"
): T | null {
  const raw = readRaw(key, where);
  if (raw === null) return null;
  const entry = parseEnvelope(raw);
  if (!entry || !guard(entry.data) || Date.now() - entry.ts > maxAgeMs) {
    remove(key, where);
    return null;
  }
  return entry.data;
}

/**
 * Cache a value. When the quota is full, the oldest quarter of the cache entries is
 * dropped and the write tried once more.
 */
export function write(key: string, data: unknown, { ts = Date.now(), where = "local" as Area } = {}): boolean {
  const value = JSON.stringify({ v: 1, ts, data } satisfies Envelope);
  if (writeRaw(key, value, where)) return true;
  const entries = cacheEntries("si:", where).sort((a, b) => a.ts - b.ts);
  if (entries.length === 0) return false;
  for (const entry of entries.slice(0, Math.ceil(entries.length / 4))) remove(entry.key, where);
  return writeRaw(key, value, where);
}

function cacheEntries(prefix: string, where: Area): { key: string; ts: number }[] {
  const storage = area(where);
  if (!storage) return [];
  const entries: { key: string; ts: number }[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(prefix)) continue;
      // Unreadable entries sort first, so they go first
      entries.push({ key, ts: parseEnvelope(storage.getItem(key))?.ts ?? 0 });
    }
  } catch {
    return entries;
  }
  return entries;
}

/** Remove the entries under `prefix` that are older than `maxAgeMs` or unreadable, keeping at most `maxEntries` */
export function evict(prefix: string, { maxAgeMs, maxEntries }: { maxAgeMs: number; maxEntries: number }): void {
  const now = Date.now();
  const kept = cacheEntries(prefix, "local").filter((entry) => {
    const stale = entry.ts === 0 || now - entry.ts > maxAgeMs;
    if (stale) remove(entry.key);
    return !stale;
  });
  kept.sort((a, b) => b.ts - a.ts);
  for (const entry of kept.slice(maxEntries)) remove(entry.key);
}

const LEGACY_SCHEDULE = /^schedule_(.+)_(\d{4})_(\d{1,2})$/;
const LEGACY_MOSQUES = /^mosques_(-?\d+\.\d+)_(-?\d+\.\d+)_r(\d+)$/;

/**
 * Move caches written by earlier versions to the current keys, keeping their age.
 * Idempotent; anything that can't be moved is dropped (it's only a cache).
 */
export function migrateLegacy(): void {
  const storage = area("local");
  if (!storage) return;
  let keys: string[];
  try {
    keys = Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? "");
  } catch {
    return;
  }
  for (const key of keys) {
    const schedule = LEGACY_SCHEDULE.exec(key);
    const mosques = LEGACY_MOSQUES.exec(key);
    if (!schedule && !mosques && key !== "detectedKecamatan") continue;
    try {
      const old: unknown = JSON.parse(storage.getItem(key) ?? "null");
      // Months of old numeric city ids are dropped with the rest
      if (schedule && isCityId(schedule[1]) && isObject(old) && typeof old._ts === "number" && isObject(old.data)) {
        const { lokasi, daerah, jadwal } = old.data;
        if (isScheduleDayList(jadwal)) {
          const data: ScheduleData = {
            id: schedule[1],
            lokasi: typeof lokasi === "string" ? lokasi : "",
            daerah: typeof daerah === "string" ? daerah : "",
            jadwal,
          };
          write(KEYS.schedule(schedule[1], Number(schedule[2]), Number(schedule[3])), data, { ts: old._ts });
        }
      } else if (mosques && isObject(old) && typeof old.ts === "number" && isMosqueList(old.data)) {
        write(KEYS.mosques(Number(mosques[1]), Number(mosques[2]), Number(mosques[3])), old.data, { ts: old.ts });
      }
    } catch {
      // Unreadable: just drop it
    }
    remove(key);
  }
  // The clock offset is only a session cache: the old entry is simply dropped
  remove("timeOffset", "session");
}

/** Once at start-up: move old caches over and sweep out what has expired */
export function prepareStorage(): void {
  migrateLegacy();
  evict(PREFIX.schedule, { maxAgeMs: SCHEDULE_CACHE_MAX_AGE, maxEntries: 24 });
  evict(PREFIX.mosques, { maxAgeMs: MOSQUE_CACHE_MAX_AGE, maxEntries: 20 });
}

/** Whether the storage can be used at all (not in some private modes) */
export function isAvailable(where: Area = "local"): boolean {
  try {
    area(where)?.getItem("");
    return area(where) !== null;
  } catch {
    return false;
  }
}
