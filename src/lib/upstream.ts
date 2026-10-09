// Upstream services the API routes call. Each address can be replaced through a
// server-side environment variable so the end-to-end tests point the routes at a
// local mock instead of the internet; production uses the defaults.

/** MyQuran API v3: prayer schedules and city search */
export const MYQURAN_API_BASE =
  process.env.MYQURAN_API_BASE || "https://api.myquran.com/v3/sholat";

/** Nominatim reverse geocoding */
export const NOMINATIM_REVERSE_URL =
  process.env.NOMINATIM_REVERSE_URL || "https://nominatim.openstreetmap.org/reverse";

/**
 * Overpass mirrors, asked in this order (OVERPASS_ENDPOINTS is comma-separated).
 * private.coffee took over from overpass.kumi.systems; overpass.openstreetmap.ru no
 * longer answers.
 */
export const OVERPASS_ENDPOINTS = process.env.OVERPASS_ENDPOINTS
  ? process.env.OVERPASS_ENDPOINTS.split(",").map((url) => url.trim()).filter(Boolean)
  : [
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass-api.de/api/interpreter",
    ];

// Sent with every upstream request. Nominatim's usage policy requires an identifying
// User-Agent with a way to reach the operator.
export const UPSTREAM_USER_AGENT = "Si-Imsak/1.0 (+https://github.com/irfan-yulianto/si-imsak)";
