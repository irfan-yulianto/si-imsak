// The mosque dataset's file, data/mosques.tsv: a header, then one place per line, sorted
// by id (OpenStreetMap's, then Overture's) so that a week's changes make a small diff.
// Coordinates are whole numbers of 1e-5 degrees (~1 m). Written by the dataset build
// (scripts/mosque-data), read by /api/mosques. No imports: plain Node reads this file too.

export const TSV_HEADER = "id\tlat\tlng\ttype\tname\tstreet";

export interface DatasetRow {
  /** n123, w123 or r123 from OpenStreetMap; "o" and 32 hex digits from Overture */
  id: string;
  lat: number;
  lng: number;
  type: "masjid" | "musholla";
  name: string;
  street?: string;
}

const ID = /^(?:[nwr]\d+|o[0-9a-f]{32})$/;
const TYPE_ORDER = { n: 0, w: 1, r: 2, o: 3 } as const;

/** OpenStreetMap's nodes, ways and relations, each by number; then Overture's places */
export function compareIds(a: string, b: string): number {
  const byType = TYPE_ORDER[a[0] as keyof typeof TYPE_ORDER] - TYPE_ORDER[b[0] as keyof typeof TYPE_ORDER];
  if (byType) return byType;
  if (a[0] === "o") return a < b ? -1 : a > b ? 1 : 0;
  return Number(a.slice(1)) - Number(b.slice(1));
}

export type DataSource = "openstreetmap" | "overture";

/** Where a row of the dataset comes from, by its id */
export function sourceOf(id: string): DataSource {
  return id[0] === "o" ? "overture" : "openstreetmap";
}

/** How many rows each source gave */
export function countBySource(rows: readonly DatasetRow[]): Record<DataSource, number> {
  const counts = { openstreetmap: 0, overture: 0 };
  for (const row of rows) counts[sourceOf(row.id)]++;
  return counts;
}

/** A tab or a line break would split the row */
const clean = (text: string) => text.replace(/[\t\r\n]+/g, " ").trim();

const toE5 = (degrees: number) => Math.round(degrees * 1e5);

/** The file's text, rows sorted by id */
export function toTsv(rows: readonly DatasetRow[]): string {
  const lines = [...rows]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((row) => [row.id, toE5(row.lat), toE5(row.lng), row.type, clean(row.name), clean(row.street ?? "")].join("\t"));
  return `${[TSV_HEADER, ...lines].join("\n")}\n`;
}

/** The rows of the file's text; throws on a line it can't read */
export function parseTsv(text: string): DatasetRow[] {
  const lines = text.split("\n");
  if (lines[0] !== TSV_HEADER) throw new Error(`Unexpected header: ${lines[0].slice(0, 80)}`);
  const rows: DatasetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "") continue;
    const [id, lat, lng, type, name, street] = lines[i].split("\t");
    const latE5 = Number(lat);
    const lngE5 = Number(lng);
    if (!ID.test(id) || !Number.isInteger(latE5) || !Number.isInteger(lngE5) || (type !== "masjid" && type !== "musholla") || !name) {
      throw new Error(`Line ${i + 1} can't be read: ${lines[i].slice(0, 80)}`);
    }
    rows.push({ id, lat: latE5 / 1e5, lng: lngE5 / 1e5, type, name, ...(street && { street }) });
  }
  return rows;
}

/** What changed between two versions of the dataset, by id */
export function datasetChanges(before: readonly DatasetRow[], after: readonly DatasetRow[]): { added: number; removed: number; changed: number } {
  const old = new Map(before.map((row) => [row.id, row]));
  let added = 0;
  let changed = 0;
  for (const row of after) {
    const was = old.get(row.id);
    if (!was) added++;
    else if (toTsv([was]) !== toTsv([row])) changed++;
    old.delete(row.id);
  }
  return { added, removed: old.size, changed };
}

/** Places every complete dataset holds: a masjid known by name near each point */
export const LANDMARKS = [
  { name: /istiqlal/i, lat: -6.1702, lng: 106.8314, where: "Jakarta" },
  { name: /baiturrahman/i, lat: 5.5536, lng: 95.3175, where: "Banda Aceh" },
  { name: /akbar/i, lat: -7.3366, lng: 112.715, where: "Surabaya" },
] as const;

/** How far each source's count may move in a week: OpenStreetMap's mapping is steady, Overture's monthly releases less so */
const MAX_CHANGE: Record<DataSource, number> = { openstreetmap: 0.05, overture: 0.1 };

/**
 * Why a freshly built dataset can't replace the committed one (none: it can): rows out
 * of bounds or repeated, landmarks missing, or a source whose count moved more than
 * `maxChange` (5% for OpenStreetMap, 10% for Overture) from the `previous` dataset's,
 * which a week doesn't do but a broken build or download does. A source the previous
 * dataset didn't have isn't compared.
 */
export function datasetProblems(
  rows: readonly DatasetRow[],
  {
    bounds,
    previous,
    maxChange = MAX_CHANGE,
  }: {
    bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number };
    /** countBySource() of the previous dataset */
    previous?: Record<DataSource, number>;
    maxChange?: Record<DataSource, number>;
  }
): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) problems.push(`${row.id} appears twice`);
    ids.add(row.id);
    if (row.lat < bounds.latMin || row.lat > bounds.latMax || row.lng < bounds.lngMin || row.lng > bounds.lngMax) {
      problems.push(`${row.id} lies outside Indonesia (${row.lat}, ${row.lng})`);
    }
  }
  for (const landmark of LANDMARKS) {
    // Within 0.005° (~550 m) of where it stands
    const found = rows.some(
      (row) => Math.abs(row.lat - landmark.lat) < 0.005 && Math.abs(row.lng - landmark.lng) < 0.005 && landmark.name.test(row.name)
    );
    if (!found) problems.push(`No ${landmark.name.source} mosque near ${landmark.where}`);
  }
  if (previous) {
    const counts = countBySource(rows);
    for (const source of ["openstreetmap", "overture"] as const) {
      const before = previous[source];
      if (!before) continue;
      const change = (counts[source] - before) / before;
      if (Math.abs(change) > maxChange[source]) {
        problems.push(`${counts[source]} places from ${source}, ${(change * 100).toFixed(1)}% from ${before}: more than ${maxChange[source] * 100}%`);
      }
    }
  }
  return problems;
}
