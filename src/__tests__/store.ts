// Helpers for tests that use the real store
import { monthId, useStore, type MonthEntry } from "@/store/useStore";
import type { LocationState, ScheduleDay } from "@/types";
import { daysInMonth, isoDate } from "@/lib/city-time";

export const JAKARTA: LocationState = {
  cityId: "58a2fc6ed39fd083f55d4182bf88826d",
  cityName: "KOTA JAKARTA",
  province: "DKI JAKARTA",
  timezone: "WIB",
};
export const BANDUNG: LocationState = {
  cityId: "b5d7f8a9c0e1d2f3a4b5c6d7e8f9a0b1",
  cityName: "KOTA BANDUNG",
  province: "JAWA BARAT",
  timezone: "WIB",
};
export const DENPASAR: LocationState = {
  cityId: "0123456789abcdef0123456789abcdef",
  cityName: "KOTA DENPASAR",
  province: "BALI",
  timezone: "WITA",
};
export const JAYAPURA: LocationState = {
  cityId: "fedcba9876543210fedcba9876543210",
  cityName: "KOTA JAYAPURA",
  province: "PAPUA",
  timezone: "WIT",
};

/** The city as MyQuran lists it */
export const asCity = (location: LocationState) => ({
  id: location.cityId,
  lokasi: location.cityName,
  daerah: location.province,
});

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const pad = (n: number) => String(n).padStart(2, "0");

/** A complete day, with the given times overridden */
export function day(date: string, overrides: Partial<ScheduleDay> = {}): ScheduleDay {
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  return {
    tanggal: `${DAY_NAMES[weekday]}, ${pad(dayOfMonth)}/${pad(month)}/${year}`,
    date,
    imsak: "04:30",
    subuh: "04:40",
    terbit: "05:55",
    dhuha: "06:20",
    dzuhur: "12:05",
    ashar: "15:15",
    maghrib: "18:10",
    isya: "19:20",
    ...overrides,
  };
}

/** Every day of a month */
export function monthDays(year: number, month: number, overrides: Partial<ScheduleDay> = {}): ScheduleDay[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => day(isoDate(year, month, i + 1), overrides));
}

/** /api/schedule's answer */
export function scheduleResponse(location: LocationState, days: ScheduleDay[]) {
  return {
    status: true,
    data: { id: location.cityId, lokasi: location.cityName, daerah: location.province, jadwal: days },
  };
}

const initialState = useStore.getState();

/** Back to the state at page load (the store is shared by every test in a file) */
export function resetStore() {
  useStore.setState(initialState, true);
}

/**
 * The selected city, with the table on the month of `today`. "Today" itself comes from
 * the clock: fake it to match (vi.useFakeTimers / vi.setSystemTime).
 */
export function seedCity(location: LocationState, today: string) {
  useStore.setState({ location, viewYear: Number(today.slice(0, 4)), viewMonth: Number(today.slice(5, 7)) });
}

/** A month as if it had been loaded (or were loading, or had failed) */
export function seedMonth(
  year: number,
  month: number,
  days: ScheduleDay[],
  { cityId = useStore.getState().location.cityId, status = "ready", error = null }: Partial<MonthEntry> & { cityId?: string } = {}
) {
  useStore.setState((s) => ({ months: { ...s.months, [monthId(cityId, year, month)]: { days, status, error } } }));
}

/** A month of the store, by city */
export function monthOf(year: number, month: number, cityId = useStore.getState().location.cityId) {
  return useStore.getState().months[monthId(cityId, year, month)];
}
