export interface Location {
  id: string;
  lokasi: string; // city name from API
  daerah?: string; // province name from API
}

export interface PrayerTimes {
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface ScheduleDay {
  tanggal: string; // "Rabu, 18/02/2026"
  date: string; // "2026-02-18"
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
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
}

export type TimezoneLabel = "WIB" | "WITA" | "WIT";

export type PrayerName =
  | "Imsak"
  | "Subuh"
  | "Terbit"
  | "Dhuha"
  | "Dzuhur"
  | "Ashar"
  | "Maghrib"
  | "Isya";

export const PRAYER_NAMES: PrayerName[] = [
  "Imsak",
  "Subuh",
  "Terbit",
  "Dhuha",
  "Dzuhur",
  "Ashar",
  "Maghrib",
  "Isya",
];

export const PRAYER_KEYS: (keyof PrayerTimes)[] = [
  "imsak",
  "subuh",
  "terbit",
  "dhuha",
  "dzuhur",
  "ashar",
  "maghrib",
  "isya",
];
