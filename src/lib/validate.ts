import {
  PRAYER_KEYS,
  type Location,
  type Mosque,
  type PrayerTimes,
  type ScheduleDay,
  type ScheduleResponse,
} from "@/types";

// Type guards and parsers for everything that crosses a boundary: upstream APIs, our
// own API as the client reads it, and the browser's storage. Data that doesn't have
// the expected shape is rejected here instead of failing somewhere deeper.

type Obj = Record<string, unknown>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CITY_ID = /^[a-f0-9]{32}$/;

export const isObject = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isNonEmptyString = (value: unknown): value is string => isString(value) && value !== "";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const isHHMM = (value: unknown): value is string => isString(value) && HHMM.test(value);
export const isIsoDate = (value: unknown): value is string => isString(value) && ISO_DATE.test(value);
/** MyQuran v3 city ids are MD5 hashes */
export const isCityId = (value: unknown): value is string => isString(value) && CITY_ID.test(value);

/** A day with its label, its ISO date and all eight times as HH:MM */
export function isScheduleDay(value: unknown): value is ScheduleDay {
  return (
    isObject(value) &&
    isNonEmptyString(value.tanggal) &&
    isIsoDate(value.date) &&
    PRAYER_KEYS.every((key) => isHHMM(value[key]))
  );
}

export function isLocation(value: unknown): value is Location {
  return (
    isObject(value) &&
    isCityId(value.id) &&
    isNonEmptyString(value.lokasi) &&
    (value.daerah === undefined || isString(value.daerah))
  );
}

export const isScheduleDayList = (value: unknown): value is ScheduleDay[] =>
  Array.isArray(value) && value.every(isScheduleDay);

/** A month as /api/schedule returns it (and as it is cached for offline use) */
export type ScheduleData = NonNullable<ScheduleResponse["data"]>;

export function isScheduleData(value: unknown): value is ScheduleData {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.lokasi) &&
    isString(value.daerah) &&
    isScheduleDayList(value.jadwal)
  );
}

function isMosque(value: unknown): value is Mosque {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isString(value.name) &&
    isFiniteNumber(value.lat) &&
    isFiniteNumber(value.lng) &&
    isFiniteNumber(value.distance) &&
    (value.address === undefined || isString(value.address)) &&
    (value.type === undefined || value.type === "masjid" || value.type === "musholla")
  );
}

/** An upstream (MyQuran) day for `date` in our format, or null unless all eight times are HH:MM */
export function toScheduleDay(date: string, raw: unknown): ScheduleDay | null {
  if (!isObject(raw) || !isNonEmptyString(raw.tanggal)) return null;
  const times = {} as PrayerTimes;
  for (const key of PRAYER_KEYS) {
    const value = raw[key];
    if (!isHHMM(value)) return null;
    times[key] = value;
  }
  return { tanggal: raw.tanggal, date, ...times };
}

export interface UpstreamPeriod {
  /** The days by ISO date, each still unchecked (see toScheduleDay) */
  jadwal: Obj;
  kabko?: string;
  prov?: string;
}

/** MyQuran's answer for a month or a day: its data when it holds a schedule, else null */
export function parseUpstreamPeriod(body: unknown): UpstreamPeriod | null {
  if (!isObject(body) || !body.status || !isObject(body.data) || !isObject(body.data.jadwal)) return null;
  const { jadwal, kabko, prov } = body.data;
  return { jadwal, ...(isString(kabko) && { kabko }), ...(isString(prov) && { prov }) };
}

/** /api/schedule's answer as the client reads it; null when it isn't one */
export function parseScheduleResponse(body: unknown): ScheduleResponse | null {
  if (!isObject(body) || typeof body.status !== "boolean") return null;
  if (!body.status) return { status: false, ...(isString(body.error) && { error: body.error }) };
  const data = body.data;
  if (!isObject(data) || !Array.isArray(data.jadwal) || !data.jadwal.every(isScheduleDay)) return null;
  return {
    status: true,
    ...(body.partial === true && { partial: true }),
    data: {
      id: isString(data.id) ? data.id : "",
      lokasi: isString(data.lokasi) ? data.lokasi : "",
      daerah: isString(data.daerah) ? data.daerah : "",
      jadwal: data.jadwal,
    },
  };
}

/** The well-formed cities in a `{ data: [...] }` list, from MyQuran or /api/cities */
export function parseCityList(body: unknown): Location[] {
  if (!isObject(body) || !Array.isArray(body.data)) return [];
  return body.data.flatMap((city: unknown) =>
    isObject(city) && isCityId(city.id) && isNonEmptyString(city.lokasi)
      ? [{ id: city.id, lokasi: city.lokasi, daerah: isString(city.daerah) ? city.daerah : "" }]
      : []
  );
}

/** The mosques in /api/mosques' answer; null when it isn't a successful one */
export function parseMosques(body: unknown): Mosque[] | null {
  if (!isObject(body) || body.status !== true || !Array.isArray(body.data)) return null;
  return body.data.filter(isMosque);
}

/** The server clock in /api/time's answer, or null */
export function parseServerTime(body: unknown): number | null {
  return isObject(body) && isFiniteNumber(body.now) ? body.now : null;
}
