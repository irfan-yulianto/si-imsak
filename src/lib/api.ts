import { CitySearchResponse, ScheduleResponse } from "@/types";
import { SCHEDULE_CACHE_MAX_AGE } from "@/lib/constants";

const API_BASE = "/api";
const REQUEST_TIMEOUT = 15000; // 15 seconds

function evictOldScheduleCaches() {
  const now = Date.now();
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("schedule_")) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || "");
        if (!val._ts || now - val._ts > SCHEDULE_CACHE_MAX_AGE) {
          keysToRemove.push(key);
        }
      } catch (e) {
        console.warn(`Failed to parse cached schedule for key ${key}:`, e);
        if (key) keysToRemove.push(key);
      }
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}/geocode?lat=${lat}&lng=${lng}`, {
      signal: controller.signal,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.status ? data.city : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchCities(keyword: string, signal?: AbortSignal): Promise<CitySearchResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(`${API_BASE}/cities?q=${encodeURIComponent(keyword)}`, { signal: controller.signal });
    if (!res.ok) throw new Error("Failed to search cities");
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getSchedule(
  cityId: string,
  year: number,
  month: number
): Promise<ScheduleResponse> {
  const cacheKey = `schedule_${cityId}_${year}_${month}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(
        `${API_BASE}/schedule?city_id=${cityId}&year=${year}&month=${month}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      const data: ScheduleResponse = await res.json();

      // Cache to localStorage for offline use (with timestamp for TTL)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ _ts: Date.now(), ...data }));
        } catch (e) {
          // localStorage full — evict old schedule caches and retry
          console.warn("localStorage full, attempting to evict old caches:", e);
          try {
            evictOldScheduleCaches();
            localStorage.setItem(cacheKey, JSON.stringify({ _ts: Date.now(), ...data }));
          } catch (e2) {
            // Still full or Safari private mode — give up
            console.warn("Failed to cache schedule even after eviction (Storage full or Safari private mode):", e2);
          }
        }
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    // Try offline fallback
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Reject cache older than TTL
            if (parsed._ts && Date.now() - parsed._ts > SCHEDULE_CACHE_MAX_AGE) {
              localStorage.removeItem(cacheKey);
            } else {
              return parsed;
            }
          } catch (e) {
            console.warn(`Failed to parse cached schedule for fallback (${cacheKey}):`, e);
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (e) {
        // localStorage not available (Safari private mode)
        console.warn("localStorage not available for offline fallback (Safari private mode?):", e);
      }
    }
    throw error;
  }
}
