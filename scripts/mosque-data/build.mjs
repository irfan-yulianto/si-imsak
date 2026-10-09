// Builds the mosque dataset from the GeoJSON sequence `osmium export` writes (see
// build.sh): keeps the masjid and musholla (isMosque in src/lib/mosque-osm.ts), lists a
// place mapped twice once, adds the mosques Overture Places has where OpenStreetMap has
// none (from overture.py's output, when given), and writes data/mosques.tsv and
// data/mosques.meta.json.
//
//   node scripts/mosque-data/build.mjs candidates.geojsonseq data [OSM timestamp] [overture.jsonl] [Overture release]
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { INDONESIA_BOUNDS } from "../../src/lib/constants.ts";
import { addMissing, dedupe, placeFromFeature, placeFromOverture } from "../../src/lib/mosque-osm.ts";
import { toTsv } from "../../src/lib/mosque-tsv.ts";

const [input, outDir, osmTimestamp = "", overtureInput, overtureRelease = ""] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("usage: node build.mjs <features.geojsonseq> <out dir> [OSM timestamp] [overture.jsonl] [Overture release]");
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
const candidates = [];
let overtureRecords = 0;
if (overtureInput) {
  for await (const record of records(overtureInput)) {
    overtureRecords++;
    const place = placeFromOverture(record);
    if (place && place.lat >= latMin && place.lat <= latMax && place.lng >= lngMin && place.lng <= lngMax) candidates.push(place);
  }
}
candidates.sort((a, b) => b.rank - a.rank || (a.id < b.id ? -1 : 1));
const overture = addMissing(osm, candidates, (place) => place.sourceName);

const rows = [...osm, ...overture].map(({ id, lat, lng, type, name, street }) => ({ id, lat, lng, type, name, street }));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "mosques.tsv"), toTsv(rows));

const count = (type) => rows.filter((row) => row.type === type).length;
const meta = {
  source: "OpenStreetMap (Geofabrik's extract of Indonesia) and Overture Maps Foundation's places",
  license: "ODbL-1.0; the places from Overture also CDLA-Permissive-2.0 (see LICENSE)",
  osmTimestamp,
  overtureRelease,
  places: rows.length,
  masjid: count("masjid"),
  musholla: count("musholla"),
  openstreetmap: osm.length,
  overture: overture.length,
};
fs.writeFileSync(path.join(outDir, "mosques.meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

console.log(`OpenStreetMap: ${features} candidates, ${byId.size} mosques, ${osm.length} after duplicates, ${osm.filter((place) => place.notable).length} well-known`);
if (overtureInput) {
  console.log(`Overture ${overtureRelease}: ${overtureRecords} records, ${candidates.length} named like a mosque and sure enough, ${overture.length} not yet listed`);
}
console.log(`${rows.length} places (${meta.masjid} masjid, ${meta.musholla} musholla)`);
