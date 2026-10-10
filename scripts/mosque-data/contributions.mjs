// The suggestions the owner approved, from this repository's issues, as one JSON line each
// for build.mjs (see src/lib/mosque-contrib.ts for what an issue holds):
//
//   gh api --paginate "repos/$GITHUB_REPOSITORY/issues?labels=usulan-masjid&state=all&per_page=100" \
//     --jq '.[] | tojson' > suggestions.jsonl
//   node scripts/mosque-data/contributions.mjs suggestions.jsonl contrib.jsonl
//
// Keeps the issues labelled usulan-disetujui (and not usulan-ditolak since), the earliest
// first; warns about an approved issue whose JSON block can't be read, without failing;
// and says how many open suggestions still await a verdict. The labels are the trust
// boundary: only the owner sets them, while the body is data.
import fs from "node:fs";
import readline from "node:readline";
import { APPROVED_LABEL, REJECTED_LABEL, isApproved, labelNames, parseSuggestionIssue } from "../../src/lib/mosque-contrib.ts";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node contributions.mjs <issues.jsonl> <contrib.jsonl>");
  process.exit(2);
}

const approved = [];
let undecided = 0;
let unreadable = 0;
for await (const line of readline.createInterface({ input: fs.createReadStream(input), crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  let issue;
  try {
    issue = JSON.parse(line);
  } catch {
    console.log("::warning::A line of the issues file isn't JSON");
    continue;
  }
  if (typeof issue !== "object" || issue === null || issue.pull_request) continue;
  const labels = labelNames(issue);
  if (issue.state === "open" && !labels.includes(APPROVED_LABEL) && !labels.includes(REJECTED_LABEL)) undecided++;
  if (!isApproved(issue)) continue;
  const suggestion = parseSuggestionIssue(issue);
  if (!suggestion) {
    unreadable++;
    console.log(`::warning::Issue #${issue.number} is approved, but its JSON block can't be read: it is left out`);
    continue;
  }
  approved.push(suggestion);
}
approved.sort((a, b) => a.number - b.number);
fs.writeFileSync(output, approved.map((suggestion) => `${JSON.stringify(suggestion)}\n`).join(""));

console.log(`${approved.length} approved suggestions written, ${unreadable} unreadable, ${undecided} open ones await a verdict`);
if (undecided) console.log(`::notice::${undecided} usulan masjid menunggu label ${APPROVED_LABEL} atau ${REJECTED_LABEL}`);
