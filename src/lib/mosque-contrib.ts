// Users' suggestions of mosques and mushollas, kept as issues of this repository: what the
// app writes into an issue (/api/mosques/suggest), and what the dataset build reads back
// from the ones the owner approved (scripts/mosque-data/contributions.mjs). No imports:
// plain Node reads this file too.

/** The label every suggestion issue carries */
export const SUGGESTION_LABEL = "usulan-masjid";
/** The owner's verdict, by label: an approved suggestion enters the dataset, a rejected one never */
export const APPROVED_LABEL = "usulan-disetujui";
export const REJECTED_LABEL = "usulan-ditolak";
/** From this many open suggestions on, the app takes no more until the owner has looked */
export const MAX_OPEN_SUGGESTIONS = 50;
/** A listed place this close (meters) to the suggested one is that one: it is in the data already */
export const NEAR_PLACE_M = 60;
/**
 * What a suggested name or street may hold: letters, marks, digits, spaces and a little
 * punctuation. Nothing that is markdown, a link or a mention in the issue, and nothing
 * invisible (control characters, zero-width or bidi marks)
 */
export const NAME_ALLOWED = /^[\p{L}\p{M}\p{N} '’\-.,()/&]+$/u;
export const NAME_MIN = 2;
export const NAME_MAX = 80;

/** A suggestion as the app validated it */
export interface Suggestion {
  type: "masjid" | "musholla";
  /** The full name, starting with its kind ("Musholla Al-Ikhlas") */
  name: string;
  street?: string;
  /** The position, to five decimals */
  lat: number;
  lng: number;
  /** The fix's accuracy when it was sent (m) */
  accuracy: number;
  /** When it was sent (ISO 8601) */
  at: string;
}

/** The JSON block's format; a reader skips a block of another */
const FORMAT = 1;

/** The issue's title */
export function suggestionTitle(suggestion: Pick<Suggestion, "name">): string {
  return `Usulan: ${suggestion.name}`;
}

/**
 * The issue's body: for people, a table, map links and what to do; for the build, the
 * suggestion as one JSON line in a fenced block. The owner may edit that block before
 * labelling: it is what the build reads.
 */
export function suggestionBody(suggestion: Suggestion): string {
  const { type, name, street, lat, lng, accuracy, at } = suggestion;
  const data = JSON.stringify({ v: FORMAT, type, name, ...(street && { street }), lat, lng, accuracy, at });
  return [
    "| | |",
    "|---|---|",
    `| Jenis | ${type === "musholla" ? "Musholla" : "Masjid"} |`,
    `| Nama | ${name} |`,
    `| Jalan | ${street ?? "–"} |`,
    `| Posisi | ${lat}, ${lng} (±${Math.round(accuracy)} m) |`,
    `| Dikirim | ${at} |`,
    "",
    `[OpenStreetMap](https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}) · [Google Maps](https://www.google.com/maps/search/?api=1&query=${lat},${lng})`,
    "",
    `**Moderasi.** Periksa di peta, lalu beri label \`${APPROVED_LABEL}\` bila benar atau \`${REJECTED_LABEL}\` bila tidak, dan tutup issue ini. Bila ada yang perlu dibetulkan (nama, jenis, posisi), ubah blok JSON di bawah sebelum memberi label: itulah yang dibaca workflow **Mosque data** setiap minggu.`,
    "",
    "```json",
    data,
    "```",
  ].join("\n");
}

/** The fields of a GitHub issue the build reads, as the API gives them (anything may be missing) */
export interface SuggestionIssue {
  number?: unknown;
  state?: unknown;
  body?: unknown;
  labels?: unknown;
  /** Present on a pull request, which the issues API lists too */
  pull_request?: unknown;
}

/** The names of an issue's labels (the API gives objects; a hand-written fixture may give strings) */
export function labelNames(issue: SuggestionIssue): string[] {
  if (!Array.isArray(issue.labels)) return [];
  const names: string[] = [];
  for (const label of issue.labels) {
    if (typeof label === "string") names.push(label);
    else if (typeof label === "object" && label !== null && typeof (label as { name?: unknown }).name === "string") {
      names.push((label as { name: string }).name);
    }
  }
  return names;
}

/** Whether the owner approved the issue's suggestion: labelled approved, and not rejected since */
export function isApproved(issue: SuggestionIssue): boolean {
  const names = labelNames(issue);
  return names.includes(APPROVED_LABEL) && !names.includes(REJECTED_LABEL);
}

const FENCE = /```json[^\n]*\n([\s\S]*?)\n```/;

/**
 * A suggested name or street as kept: composed (NFC), single-spaced, trimmed, and only
 * when it is NAME_MIN to `max` characters of what NAME_ALLOWED permits; else null
 */
export function suggestionText(value: unknown, max = NAME_MAX): string | null {
  if (typeof value !== "string") return null;
  const clean = value.normalize("NFC").replace(/\s+/g, " ").trim();
  return clean.length >= NAME_MIN && clean.length <= max && NAME_ALLOWED.test(clean) ? clean : null;
}
const text = suggestionText;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * The suggestion an issue holds, from the first fenced JSON block of its body, with the
 * issue's number; null when the block is missing, of another format, or doesn't describe
 * a suggestion (the labels aren't looked at: see isApproved)
 */
export function parseSuggestionIssue(issue: SuggestionIssue): (Suggestion & { number: number }) | null {
  const { number, body } = issue;
  if (!Number.isInteger(number) || (number as number) <= 0 || typeof body !== "string") return null;
  const block = FENCE.exec(body)?.[1];
  if (!block) return null;
  let data: unknown;
  try {
    data = JSON.parse(block);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const name = text(record.name, NAME_MAX);
  const street = record.street === undefined || record.street === "" ? undefined : text(record.street, NAME_MAX);
  if (
    record.v !== FORMAT ||
    (record.type !== "masjid" && record.type !== "musholla") ||
    !name ||
    street === null ||
    !finite(record.lat) ||
    !finite(record.lng) ||
    !finite(record.accuracy) ||
    record.accuracy < 0 ||
    typeof record.at !== "string"
  ) {
    return null;
  }
  return {
    number: number as number,
    type: record.type,
    name,
    ...(street && { street }),
    lat: record.lat,
    lng: record.lng,
    accuracy: record.accuracy,
    at: record.at,
  };
}
