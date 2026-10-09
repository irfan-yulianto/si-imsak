// Builds the mosque dataset from the GeoJSON sequence `osmium export` writes (see
// build.sh): keeps the masjid and musholla (isMosque in src/lib/mosque-osm.ts), lists a
// place mapped twice once, and writes data/mosques.tsv and data/mosques.meta.json.
//
//   node scripts/mosque-data/build.mjs candidates.geojsonseq data [OSM timestamp]
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { dedupe, placeFromFeature } from "../../src/lib/mosque-osm.ts";
import { toTsv } from "../../src/lib/mosque-tsv.ts";

const [input, outDir, osmTimestamp = ""] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("usage: node build.mjs <features.geojsonseq> <out dir> [OSM timestamp]");
  process.exit(2);
}

// A closed way can come both as a line and as an area: the first one counts
const byId = new Map();
let features = 0;
const lines = readline.createInterface({ input: fs.createReadStream(input), crlfDelay: Infinity });
for await (const raw of lines) {
  // Each record may start with the RS character (RFC 8142)
  const line = raw.replace(/^\x1e/, "").trim();
  if (!line) continue;
  features++;
  const place = placeFromFeature(JSON.parse(line));
  if (place && !byId.has(place.id)) byId.set(place.id, place);
}

// Of one place mapped twice, the named and fuller entry stays
const ranked = [...byId.values()].sort((a, b) => b.rank - a.rank);
const places = dedupe(ranked, (place) => place.osmName);

const rows = places.map(({ id, lat, lng, type, name, street }) => ({ id, lat, lng, type, name, street }));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "mosques.tsv"), toTsv(rows));

const count = (type) => rows.filter((row) => row.type === type).length;
const meta = {
  source: "OpenStreetMap, from Geofabrik's extract of Indonesia",
  license: "ODbL-1.0",
  osmTimestamp,
  places: rows.length,
  masjid: count("masjid"),
  musholla: count("musholla"),
};
fs.writeFileSync(path.join(outDir, "mosques.meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

console.log(`${features} candidates, ${byId.size} mosques, ${rows.length} after duplicates (${meta.masjid} masjid, ${meta.musholla} musholla)`);
