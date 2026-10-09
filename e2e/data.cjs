// Deterministic upstream data, shared by the mock server and the specs. CommonJS, so
// both the TypeScript specs (compiled to CommonJS) and the ESM mock server can load it.

// Times for every day; each city shifts them by a few minutes so their schedules
// can be told apart on screen.
const BASE_TIMES = {
  imsak: "04:11", subuh: "04:21", terbit: "05:33", dhuha: "05:59",
  dzuhur: "11:44", ashar: "14:55", maghrib: "17:51", isya: "19:00",
};

const CITIES = [
  { id: "58a2fc6ed39fd083f55d4182bf88826d", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", lat: -6.1754, lng: 106.8272, offset: 0, address: { city: "Daerah Khusus Ibukota Jakarta" } },
  { id: "6b1f0a3a2c4d4e5f8a9b0c1d2e3f4a5b", lokasi: "KOTA BANDUNG", daerah: "JAWA BARAT", lat: -6.9175, lng: 107.6191, offset: 4, address: { city: "Kota Bandung" } },
  { id: "7c2a1b4b3d5e5f6a9bac1d2e3f4a5b6c", lokasi: "KAB. BANDUNG", daerah: "JAWA BARAT", lat: -7.0251, lng: 107.5197, offset: 5, address: { county: "Kabupaten Bandung" } },
  { id: "8d3b2c5c4e6f6a7bacbd2e3f4a5b6c7d", lokasi: "KOTA DENPASAR", daerah: "BALI", lat: -8.6705, lng: 115.2126, offset: -12, address: { city: "Kota Denpasar" } },
  { id: "9e4c3d6d5f7a7b8cbdce3f4a5b6c7d8e", lokasi: "KOTA JAYAPURA", daerah: "PAPUA", lat: -2.5337, lng: 140.7181, offset: 9, address: { city: "Kota Jayapura" } },
  { id: "af5d4e7e6a8b8c9dcedf4a5b6c7d8e9f", lokasi: "KOTA SURABAYA", daerah: "JAWA TIMUR", lat: -7.2575, lng: 112.7521, offset: -6, address: { city: "Kota Surabaya" } },
];

const JAKARTA = CITIES[0];
const BANDUNG = CITIES[1];
const DENPASAR = CITIES[3];
const JAYAPURA = CITIES[4];

function cityById(id) {
  return CITIES.find((c) => c.id === id);
}

const pad = (n) => String(n).padStart(2, "0");

function shift(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** The eight times of every day for this city */
function timesFor(city) {
  return Object.fromEntries(Object.entries(BASE_TIMES).map(([k, v]) => [k, shift(v, city.offset)]));
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** One upstream day in MyQuran v3 format, keyed by its YYYY-MM-DD date */
function upstreamDay(city, date) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { tanggal: `${DAY_NAMES[weekday]}, ${pad(d)}/${pad(m)}/${y}`, ...timesFor(city) };
}

function daysIn(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthDates(year, month) {
  return Array.from({ length: daysIn(year, month) }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
}

/** /api/schedule's own response format, for specs that answer the route directly */
function scheduleResponse(city, year, month) {
  return {
    status: true,
    data: {
      id: city.id,
      lokasi: city.lokasi,
      daerah: city.daerah,
      jadwal: monthDates(year, month).map((date) => ({ ...upstreamDay(city, date), date })),
    },
  };
}

module.exports = { CITIES, JAKARTA, BANDUNG, DENPASAR, JAYAPURA, cityById, timesFor, upstreamDay, daysIn, monthDates, scheduleResponse };
