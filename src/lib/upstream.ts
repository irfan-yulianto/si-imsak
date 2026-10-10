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
 * GitHub's REST API, and the repository whose issues hold the mosque finder's
 * suggestions. The API's address is for the end-to-end tests only: set in production, it
 * would send the token elsewhere.
 */
export const SUGGESTION_GITHUB_API = process.env.SUGGESTION_GITHUB_API || "https://api.github.com";
export const SUGGESTION_GITHUB_REPO = process.env.SUGGESTION_GITHUB_REPO || "irfan-yulianto/si-imsak";
/** The fine-grained token (Issues: read and write on that repository); none: suggestions are off */
export const suggestionToken = (): string => process.env.SUGGESTION_GITHUB_TOKEN || "";

// Sent with every upstream request. Nominatim's usage policy requires an identifying
// User-Agent with a way to reach the operator.
export const UPSTREAM_USER_AGENT = "Si-Imsak/1.0 (+https://github.com/irfan-yulianto/si-imsak)";
