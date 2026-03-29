// Fallback location (Jakarta)
export const DEFAULT_LOCATION = {
  id: "58a2fc6ed39fd083f55d4182bf88826d",
  lokasi: "KOTA JAKARTA",
  daerah: "DKI JAKARTA",
};

// API base URL (v3 LTS)
export const MYQURAN_API_BASE = "https://api.myquran.com/v3/sholat";

// Schedule cache TTL — single source of truth (used by api.ts and useStore.ts)
export const SCHEDULE_CACHE_MAX_AGE = 7 * 24 * 3600000; // 7 days in ms

// Indonesia geographic bounds for input validation
export const INDONESIA_BOUNDS = {
  latMin: -11,
  latMax: 6,
  lngMin: 95,
  lngMax: 141,
} as const;

// Timezone mapping based on province/region
export const TIMEZONE_MAP: Record<string, string> = {
  // WIB (UTC+7)
  "ACEH": "WIB",
  "SUMATERA UTARA": "WIB",
  "SUMATERA BARAT": "WIB",
  "RIAU": "WIB",
  "JAMBI": "WIB",
  "SUMATERA SELATAN": "WIB",
  "BENGKULU": "WIB",
  "LAMPUNG": "WIB",
  "KEP. BANGKA BELITUNG": "WIB",
  "KEP. RIAU": "WIB",
  "DKI JAKARTA": "WIB",
  "JAWA BARAT": "WIB",
  "JAWA TENGAH": "WIB",
  "DI YOGYAKARTA": "WIB",
  "JAWA TIMUR": "WIB",
  "BANTEN": "WIB",
  "KALIMANTAN BARAT": "WIB",
  // WITA (UTC+8)
  "BALI": "WITA",
  "NUSA TENGGARA BARAT": "WITA",
  "NUSA TENGGARA TIMUR": "WITA",
  "KALIMANTAN TENGAH": "WITA",
  "KALIMANTAN SELATAN": "WITA",
  "KALIMANTAN TIMUR": "WITA",
  "KALIMANTAN UTARA": "WITA",
  "SULAWESI UTARA": "WITA",
  "SULAWESI TENGAH": "WITA",
  "SULAWESI SELATAN": "WITA",
  "SULAWESI TENGGARA": "WITA",
  "GORONTALO": "WITA",
  "SULAWESI BARAT": "WITA",
  // WIT (UTC+9)
  "MALUKU": "WIT",
  "MALUKU UTARA": "WIT",
  "PAPUA": "WIT",
  "PAPUA BARAT": "WIT",
  "PAPUA BARAT DAYA": "WIT",
  "PAPUA TENGAH": "WIT",
  "PAPUA PEGUNUNGAN": "WIT",
  "PAPUA SELATAN": "WIT",
};

export const TIMEZONE_OFFSETS: Record<string, number> = {
  WIB: 7,
  WITA: 8,
  WIT: 9,
};
