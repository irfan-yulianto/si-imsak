export type TimezoneLabel = "WIB" | "WITA" | "WIT";

/** A city as MyQuran lists it */
export interface Location {
  id: string;
  lokasi: string; // city name from API
  daerah?: string; // province name from API
}

/** The selected city in the store */
export interface LocationState {
  cityId: string;
  cityName: string;
  province: string;
  timezone: TimezoneLabel;
}

/** The day's times, in the order they occur */
export const PRAYER_KEYS = ["imsak", "subuh", "terbit", "dhuha", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type PrayerName = "Imsak" | "Subuh" | "Terbit" | "Dhuha" | "Dzuhur" | "Ashar" | "Maghrib" | "Isya";

/** Display names, index for index with PRAYER_KEYS */
export const PRAYER_NAMES: readonly PrayerName[] = [
  "Imsak",
  "Subuh",
  "Terbit",
  "Dhuha",
  "Dzuhur",
  "Ashar",
  "Maghrib",
  "Isya",
];

/** Each time as HH:MM */
export type PrayerTimes = Record<PrayerKey, string>;

/** A day as MyQuran returns it */
export interface UpstreamDay extends PrayerTimes {
  tanggal: string; // "Rabu, 18/02/2026"
}

/** A day as /api/schedule returns it */
export interface ScheduleDay extends UpstreamDay {
  date: string; // "2026-02-18"
}

export interface ScheduleResponse {
  status: boolean;
  /** True when upstream was missing some days of the month (response is not cached). */
  partial?: boolean;
  data?: {
    id: string;
    lokasi: string;
    daerah: string;
    jadwal: ScheduleDay[];
  };
  error?: string;
}

export interface CitySearchResponse {
  status: boolean;
  data: Location[];
  error?: string;
}

export interface GeocodeResponse {
  status: boolean;
  /** City name in MyQuran's spelling, e.g. "KOTA BANDUNG"; empty when none was found */
  city: string;
}

/** A position from the device's GPS */
export interface GeoFix {
  lat: number;
  lng: number;
  /** Meters, at 95% confidence */
  accuracy: number;
  /** When the position was taken (ms since the epoch) */
  at: number;
}

export interface Mosque {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Meters from the searched position, to the building's edge when its outline is known */
  distance: number;
  address?: string;
  type?: "masjid" | "musholla";
  /** Half the extent of the building's outline (degrees of latitude and longitude), when mapped */
  dlat?: number;
  dlng?: number;
}

export interface MosqueSearchResponse {
  status: boolean;
  data?: Mosque[];
  /**
   * Where the server searched (the rounded position), how far from there the list is
   * complete (m), and whether this server takes suggestions of unlisted places
   */
  meta?: { center: { lat: number; lng: number }; coverage: number; dataDate: string; suggestions?: boolean };
  error?: string;
  /** The failure was upstream's; trying again later may work */
  retryable?: boolean;
}

/** /api/mosques/suggest's answer: the issue the suggestion became, or why not */
export interface SuggestionResponse {
  status: boolean;
  data?: { number: number };
  error?: string;
  /** Trying again later may work */
  retryable?: boolean;
}

export interface TimeResponse {
  now: number;
}
