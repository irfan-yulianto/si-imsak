// Builds the mosque dataset from the GeoJSON sequence `osmium export` writes (see
// build.sh): keeps the masjid and musholla (isMosque in src/lib/mosque-osm.ts), lists a
// place mapped twice once, adds the mosques Overture Places has where OpenStreetMap has
// none (from overture.py's output, when given), then the suggestions of the app's users
// that the owner approved and no source has yet (from contributions.mjs's output, when
// given), and writes data/mosques.tsv and data/mosques.meta.json.
//
//   node scripts/mosque-data/build.mjs candidates.geojsonseq data [OSM timestamp] [overture.jsonl] [Overture release] [contrib.jsonl]
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { INDONESIA_BOUNDS } from "../../src/lib/constants.ts";
import { addMissing, dedupe, placeFromContribution, placeFromFeature, placeFromOverture } from "../../src/lib/mosque-osm.ts";
import { MAX_HALF_EXTENT_DEG, compareIds, toTsv } from "../../src/lib/mosque-tsv.ts";

const [input, outDir, osmTimestamp = "", overtureInput, overtureRelease = "", contribInput] = process.argv.slice(2);
if (!input || !outDir) {
  console.error(
    "usage: node build.mjs <features.geojsonseq> <out dir> [OSM timestamp] [overture.jsonl] [Overture release] [contrib.jsonl]"
  );
  process.exit(2);
}

/** The JSON records of a file with one per line */
async function* records(file) {
  for await (const raw of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
    // Each record may start with the RS character (RFC 8142)
    const line = raw.replace(/^\x1e/, "").trim();
    if (line) yield JSON.parse(line);
  }
}

// A closed way can come both as a line and as an area: the first one counts
const byId = new Map();
let features = 0;
for await (const feature of records(input)) {
  features++;
  const place = placeFromFeature(feature);
  if (place && !byId.has(place.id)) byId.set(place.id, place);
}

// Of one place mapped twice, the named and fuller entry stays
const ranked = [...byId.values()].sort((a, b) => b.rank - a.rank);
const osm = dedupe(ranked, (place) => place.sourceName);

// Overture's mosques that OpenStreetMap lacks, the surest first; an address in Indonesia
// doesn't always come with a position there
const { latMin, latMax, lngMin, lngMax } = INDONESIA_BOUNDS;
const inIndonesia = (place) => place.lat >= latMin && place.lat <= latMax && place.lng >= lngMin && place.lng <= lngMax;
const candidates = [];
let overtureRecords = 0;
if (overtureInput) {
  for await (const record of records(overtureInput)) {
    overtureRecords++;
    const place = placeFromOverture(record);
    if (place && inIndonesia(place)) candidates.push(place);
  }
}
candidates.sort((a, b) => b.rank - a.rank || (a.id < b.id ? -1 : 1));
const overture = addMissing(osm, candidates, (place) => place.sourceName);

// The users' suggestions the owner approved, the earliest first, where no source has the
// place yet: once OpenStreetMap or Overture maps it, the source's entry takes over
const suggestions = [];
if (contribInput) {
  for await (const record of records(contribInput)) {
    const place = placeFromContribution(record);
    if (place && inIndonesia(place)) suggestions.push(place);
  }
}
suggestions.sort((a, b) => compareIds(a.id, b.id));
const contributions = addMissing([...osm, ...overture], suggestions, (place) => place.sourceName);

// A building's outline is kept as its half-extents, unless it is a complex or a mistaken area
const rows = [...osm, ...overture, ...contributions].map(({ id, lat, lng, type, name, street, dlat, dlng }) => ({
  id,
  lat,
  lng,
  type,
  name,
  street,
  ...(dlat && dlng && dlat <= MAX_HALF_EXTENT_DEG && dlng <= MAX_HALF_EXTENT_DEG && { dlat, dlng }),
}));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "mosques.tsv"), toTsv(rows));

const count = (type) => rows.filter((row) => row.type === type).length;
const meta = {
  source: "OpenStreetMap (Geofabrik's extract of Indonesia), Overture Maps Foundation's places, and suggestions of the app's users",
  license: "ODbL-1.0; the places from Overture also CDLA-Permissive-2.0, the users' suggestions CC0-1.0 (see LICENSE)",
  osmTimestamp,
  overtureRelease,
  places: rows.length,
  masjid: count("masjid"),
  musholla: count("musholla"),
  openstreetmap: osm.length,
  overture: overture.length,
  contributions: contributions.length,
};
fs.writeFileSync(path.join(outDir, "mosques.meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

console.log(`OpenStreetMap: ${features} candidates, ${byId.size} mosques, ${osm.length} after duplicates, ${osm.filter((place) => place.notable).length} well-known`);
if (overtureInput) {
  console.log(`Overture ${overtureRelease}: ${overtureRecords} records, ${candidates.length} named like a mosque and sure enough, ${overture.length} not yet listed`);
}
if (contribInput) {
  console.log(`Suggestions: ${suggestions.length} approved, ${contributions.length} not yet mapped by another source`);
}
console.log(`${rows.length} places (${meta.masjid} masjid, ${meta.musholla} musholla), ${rows.filter((row) => row.dlat).length} with the building's outline`);
