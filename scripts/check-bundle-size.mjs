// Checks the home page's initial download against bundle-budget.json after `next build`:
// the gzip size of the JavaScript and CSS that index.html references, and of the HTML.
// Writes a table to $GITHUB_STEP_SUMMARY when set; exits 1 when a budget is exceeded.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const budget = JSON.parse(fs.readFileSync(path.join(root, "bundle-budget.json"), "utf8"));
const htmlPath = path.join(root, ".next/server/app/index.html");
if (!fs.existsSync(htmlPath)) {
  console.error("No .next/server/app/index.html — run `npm run build` first.");
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, "utf8");
const gzipKb = (buffer) => zlib.gzipSync(buffer, { level: 9 }).length / 1024;
const assets = (ext) =>
  [...new Set([...html.matchAll(new RegExp(`/_next/(static/[^"'\\s]+?\\.${ext})`, "g"))].map((m) => m[1]))];
const total = (files) => files.reduce((sum, file) => sum + gzipKb(fs.readFileSync(path.join(root, ".next", file))), 0);

const js = assets("js");
const css = assets("css");
const rows = [
  ["Initial JavaScript", `${js.length} files`, total(js), budget.initialJsKb],
  ["CSS", `${css.length} files`, total(css), budget.cssKb],
  ["HTML", "index.html", gzipKb(Buffer.from(html)), budget.htmlKb],
];

const over = rows.filter(([, , size, limit]) => size > limit);
const table = [
  "### Bundle size (gzip)",
  "",
  "| | Files | Size | Budget | |",
  "|---|---|---|---|---|",
  ...rows.map(([name, files, size, limit]) =>
    `| ${name} | ${files} | ${size.toFixed(1)} KB | ${limit} KB | ${size > limit ? "❌ over" : "✅"} |`
  ),
  "",
].join("\n");

console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
if (over.length > 0) {
  console.error(`Over budget: ${over.map(([name]) => name).join(", ")}. Shrink it, or raise bundle-budget.json with a reason in the PR.`);
  process.exit(1);
}
