// Checks a freshly built data/mosques.tsv before it replaces the committed one (see
// datasetProblems in src/lib/mosque-tsv.ts), and writes what changed, in Markdown, for
// the pull request. Exits 1 when the dataset can't be used.
//
//   node scripts/mosque-data/validate.mjs data/mosques.tsv [previous.tsv] [summary.md]
import fs from "node:fs";
import { INDONESIA_BOUNDS } from "../../src/lib/constants.ts";
import { countBySource, datasetChanges, datasetProblems, parseTsv } from "../../src/lib/mosque-tsv.ts";

const [file, previousFile, summaryFile] = process.argv.slice(2);
if (!file) {
  console.error("usage: node validate.mjs <mosques.tsv> [previous.tsv] [summary.md]");
  process.exit(2);
}

const rows = parseTsv(fs.readFileSync(file, "utf8"));
const previous = previousFile && fs.existsSync(previousFile) ? parseTsv(fs.readFileSync(previousFile, "utf8")) : null;
const problems = datasetProblems(rows, { bounds: INDONESIA_BOUNDS, previous: previous ? countBySource(previous) : undefined });
const changes = previous ? datasetChanges(previous, rows) : null;

const masjid = rows.filter((row) => row.type === "masjid").length;
const outlined = rows.filter((row) => row.dlat).length;
const bySource = countBySource(rows);
const n = (count) => count.toLocaleString("id-ID");
const summary = [
  `**${n(rows.length)}** tempat: ${n(masjid)} masjid, ${n(rows.length - masjid)} musholla; ${n(outlined)} dengan denah bangunan.`,
  `Dari OpenStreetMap ${n(bySource.openstreetmap)}, dari Overture ${n(bySource.overture)}, dari usulan pengguna ${n(bySource.contributions)}.`,
  changes
    ? `Dibanding data sebelumnya (${n(previous.length)}): +${n(changes.added)} baru, −${n(changes.removed)} hilang, ${n(changes.changed)} berubah.`
    : "Dataset pertama.",
  ...(problems.length ? ["", "Masalah:", ...problems.slice(0, 20).map((p) => `- ${p}`)] : []),
].join("\n");
console.log(summary);
if (summaryFile) fs.writeFileSync(summaryFile, `${summary}\n`);
if (changes && process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${changes.added}\nremoved=${changes.removed}\n`);
}
process.exit(problems.length ? 1 : 0);
