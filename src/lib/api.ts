import { CitySearchResponse, ScheduleResponse } from "@/types";
import { SCHEDULE_CACHE_MAX_AGE, roundCoord } from "@/lib/constants";
import { isObject, isScheduleData, parseCityList, parseScheduleResponse } from "@/lib/validate";
import { KEYS, read, write } from "@/lib/storage";

const API_BASE = "/api";
const REQUEST_TIMEOUT = 15000; // 15 seconds

export async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}/geocode?lat=${roundCoord(lat)}&lng=${roundCoord(lng)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return "";
    const data: unknown = await res.json();
    return isObject(data) && data.status && typeof data.city === "string" ? data.city : "";
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
    // 400 = query too short/invalid after sanitizing — same as "no results"
    if (res.status === 400) return { status: false, data: [] };
    if (!res.ok) throw new Error("Failed to search cities");
    const body: unknown = await res.json();
    return { status: isObject(body) && body.status === true, data: parseCityList(body) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// In-flight schedule requests, keyed by city/year/month. Startup, location detection
// and the countdown can ask for the same month at once — they share one request.
const inflightSchedules = new Map<string, Promise<ScheduleResponse>>();

export function getSchedule(
  cityId: string,
  year: number,
  month: number
): Promise<ScheduleResponse> {
  const key = `${cityId}:${year}-${month}`;
  const pending = inflightSchedules.get(key);
  if (pending) return pending;

  const request = fetchSchedule(cityId, year, month).finally(() => {
    inflightSchedules.delete(key);
  });
  inflightSchedules.set(key, request);
  return request;
}

async function fetchSchedule(cityId: string, year: number, month: number): Promise<ScheduleResponse> {
  const cacheKey = KEYS.schedule(cityId, year, month);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}/schedule?city_id=${cityId}&year=${year}&month=${month}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Failed to fetch schedule");
    // The timeout also covers reading the body, so a stalled response can't leave
    // the schedule loading forever
    const data = parseScheduleResponse(await res.json());
    if (!data) throw new Error("Malformed schedule response");
    // Kept for offline use; partial months (some days missing upstream) are not
    if (data.status && !data.partial && data.data) write(cacheKey, data.data);
    return data;
  } catch (error) {
    // Offline or failing: the copy from an earlier visit, if it is recent enough
    const cached = read(cacheKey, isScheduleData, SCHEDULE_CACHE_MAX_AGE);
    if (cached) return { status: true, data: cached };
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
