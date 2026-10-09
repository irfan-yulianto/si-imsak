// Compares two folders of screenshots (base and head) pixel by pixel.
//
//   node scripts/visual-diff.mjs <baseDir> <headDir> [diffDir]
//
// Prints a Markdown table (also appended to $GITHUB_STEP_SUMMARY when set), writes an
// image of every difference to diffDir, and exits with 1 when anything changed, unless
// ALLOW_VISUAL_CHANGES=1 (a PR labelled `visual-change`).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [baseDir, headDir, diffDir = "visual-diff"] = process.argv.slice(2);
if (!baseDir || !headDir) {
  console.error("usage: node scripts/visual-diff.mjs <baseDir> <headDir> [diffDir]");
  process.exit(2);
}

const pngs = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".png")) : []);
const names = [...new Set([...pngs(baseDir), ...pngs(headDir)])].sort();
if (names.length === 0) {
  console.error("No screenshots to compare");
  process.exit(2);
}
fs.mkdirSync(diffDir, { recursive: true });

const rows = [];
let changed = 0;
for (const name of names) {
  const basePath = path.join(baseDir, name);
  const headPath = path.join(headDir, name);
  if (!fs.existsSync(basePath) || !fs.existsSync(headPath)) {
    rows.push([name, fs.existsSync(headPath) ? "new" : "removed", "–"]);
    changed++;
    continue;
  }
  const base = PNG.sync.read(fs.readFileSync(basePath));
  const head = PNG.sync.read(fs.readFileSync(headPath));
  if (base.width !== head.width || base.height !== head.height) {
    rows.push([name, `size ${base.width}×${base.height} → ${head.width}×${head.height}`, "–"]);
    changed++;
    continue;
  }
  const diff = new PNG({ width: base.width, height: base.height });
  // threshold 0.1: ignore anti-aliasing noise, report any real change
  const pixels = pixelmatch(base.data, head.data, diff.data, base.width, base.height, { threshold: 0.1 });
  if (pixels > 0) {
    fs.writeFileSync(path.join(diffDir, name), PNG.sync.write(diff));
    changed++;
  }
  const share = ((pixels / (base.width * base.height)) * 100).toFixed(3);
  rows.push([name, pixels > 0 ? "changed" : "same", pixels > 0 ? `${pixels} (${share}%)` : "0"]);
}

const allowed = process.env.ALLOW_VISUAL_CHANGES === "1";
const summary = [
  `### Screenshots: ${changed === 0 ? "no differences" : `${changed} of ${names.length} changed`}`,
  "",
  "| Screenshot | Result | Pixels changed |",
  "|---|---|---|",
  ...rows.map((r) => `| ${r.join(" | ")} |`),
  "",
  changed === 0
    ? ""
    : allowed
      ? "Changes are expected (label `visual-change`): review the diff images in the `visual-diff` artifact."
      : "Unexpected visual changes. If they are intended, add the `visual-change` label to the PR.",
].join("\n");

console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
process.exit(changed > 0 && !allowed ? 1 : 0);
