// @vitest-environment node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  APPROVED_LABEL,
  REJECTED_LABEL,
  SUGGESTION_LABEL,
  isApproved,
  labelNames,
  parseSuggestionIssue,
  suggestionBody,
  suggestionTitle,
  type Suggestion,
} from "./mosque-contrib";

const suggestion: Suggestion = {
  type: "musholla",
  name: "Musholla Al-Ikhlas",
  street: "Gang Damai 3",
  lat: -6.20123,
  lng: 106.80456,
  accuracy: 12,
  at: "2026-10-10T03:00:00.000Z",
};
/** An issue as the GitHub API lists it, holding `suggestion` unless the body says otherwise */
const issue = (number: number, labels: string[], overrides: { body?: string; state?: string; pull_request?: object } = {}) => ({
  number,
  state: "closed",
  body: suggestionBody(suggestion),
  labels: labels.map((name) => ({ name, color: "ededed" })),
  ...overrides,
});

describe("suggestionTitle and suggestionBody", () => {
  it("write the issue people read and the block the build reads", () => {
    expect(suggestionTitle(suggestion)).toBe("Usulan: Musholla Al-Ikhlas");
    const body = suggestionBody(suggestion);
    expect(body).toContain("| Nama | Musholla Al-Ikhlas |");
    expect(body).toContain("| Jalan | Gang Damai 3 |");
    expect(body).toContain("| Posisi | -6.20123, 106.80456 (±12 m) |");
    expect(body).toContain("https://www.openstreetmap.org/?mlat=-6.20123&mlon=106.80456#map=19/-6.20123/106.80456");
    expect(body).toContain(`label \`${APPROVED_LABEL}\``);
    // One JSON line, closed by a fence on its own line: nothing in the data can end the block early
    expect(body).toMatch(/\n```json\n\{"v":1,"type":"musholla","name":"Musholla Al-Ikhlas","street":"Gang Damai 3","lat":-6\.20123,"lng":106\.80456,"accuracy":12,"at":"2026-10-10T03:00:00\.000Z"\}\n```$/);
    expect(suggestionBody({ ...suggestion, street: undefined })).toContain("| Jalan | – |");
  });
});

describe("parseSuggestionIssue", () => {
  it("reads back what suggestionBody wrote, with the issue's number", () => {
    expect(parseSuggestionIssue(issue(12, [SUGGESTION_LABEL]))).toEqual({ number: 12, ...suggestion });
    const bare = { ...suggestion, street: undefined };
    expect(parseSuggestionIssue({ number: 3, body: suggestionBody(bare) })).toEqual({ number: 3, type: "musholla", name: bare.name, lat: bare.lat, lng: bare.lng, accuracy: 12, at: bare.at });
  });

  it("reads a block the owner edited by hand, pretty-printed, with a corrected name", () => {
    const body = [
      "Some words above.",
      "```json",
      "{",
      '  "v": 1,',
      '  "type": "masjid",',
      '  "name": "Masjid  Nurul Iman ",',
      '  "street": "",',
      '  "lat": -6.2,',
      '  "lng": 106.8,',
      '  "accuracy": 8,',
      '  "at": "2026-10-10T03:00:00.000Z"',
      "}",
      "```",
    ].join("\n");
    expect(parseSuggestionIssue({ number: 7, body })).toEqual({
      number: 7,
      type: "masjid",
      name: "Masjid Nurul Iman",
      lat: -6.2,
      lng: 106.8,
      accuracy: 8,
      at: "2026-10-10T03:00:00.000Z",
    });
  });

  it.each([
    ["no number", { number: undefined }],
    ["a number that isn't an issue's", { number: 1.5 }],
    ["no body", { body: undefined }],
    ["a body without a JSON block", { body: "| Nama | Masjid |" }],
    ["a block that isn't JSON", { body: "```json\n{oops\n```" }],
    ["a block of another format", { body: suggestionBody(suggestion).replace('"v":1', '"v":2') }],
    ["a kind that isn't a mosque's", { body: suggestionBody(suggestion).replace('"musholla"', '"gereja"') }],
    ["a name with markdown in it", { body: suggestionBody({ ...suggestion, name: "Musholla Al-Ikhlas | <b>" }) }],
    ["a name with a mention", { body: suggestionBody({ ...suggestion, name: "Musholla @someone" }) }],
    ["a street with a link", { body: suggestionBody({ ...suggestion, street: "http://x.y" }) }],
    ["a position that isn't a number", { body: suggestionBody({ ...suggestion, lat: "-6.2" as unknown as number }) }],
    ["a negative accuracy", { body: suggestionBody(suggestion).replace('"accuracy":12', '"accuracy":-1') }],
  ])("gives null for %s", (_what, overrides) => {
    expect(parseSuggestionIssue({ ...issue(12, []), ...overrides })).toBeNull();
  });
});

describe("labelNames and isApproved", () => {
  it("read the labels as the API gives them, or as names", () => {
    expect(labelNames(issue(1, [SUGGESTION_LABEL, APPROVED_LABEL]))).toEqual([SUGGESTION_LABEL, APPROVED_LABEL]);
    expect(labelNames({ labels: ["a", { name: "b" }, 3, null] })).toEqual(["a", "b"]);
    expect(labelNames({})).toEqual([]);
  });

  it("count only the approved ones the owner hasn't rejected since", () => {
    expect(isApproved(issue(1, [SUGGESTION_LABEL, APPROVED_LABEL]))).toBe(true);
    expect(isApproved(issue(1, [SUGGESTION_LABEL]))).toBe(false);
    expect(isApproved(issue(1, [SUGGESTION_LABEL, APPROVED_LABEL, REJECTED_LABEL]))).toBe(false);
  });
});

describe("scripts/mosque-data/contributions.mjs", () => {
  it("writes the approved suggestions, earliest first, and tells about the rest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contrib-"));
    const input = path.join(dir, "suggestions.jsonl");
    const output = path.join(dir, "contrib.jsonl");
    const issues = [
      issue(12, [SUGGESTION_LABEL, APPROVED_LABEL]),
      issue(13, [SUGGESTION_LABEL, REJECTED_LABEL]),
      issue(14, [SUGGESTION_LABEL, APPROVED_LABEL, REJECTED_LABEL]),
      issue(15, [SUGGESTION_LABEL], { state: "open" }),
      issue(16, [SUGGESTION_LABEL, APPROVED_LABEL], { body: "Edited away." }),
      issue(17, [SUGGESTION_LABEL, APPROVED_LABEL], { pull_request: { url: "x" } }),
      issue(11, [SUGGESTION_LABEL, APPROVED_LABEL]),
    ];
    fs.writeFileSync(input, `${issues.map((i) => JSON.stringify(i)).join("\n")}\n\nnot json\n`);

    const script = path.join(process.cwd(), "scripts", "mosque-data", "contributions.mjs");
    const log = execFileSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", script, input, output], { encoding: "utf8" });

    const written = fs.readFileSync(output, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { number: number; name: string });
    expect(written.map((s) => s.number)).toEqual([11, 12]);
    expect(written[0].name).toBe("Musholla Al-Ikhlas");
    expect(log).toContain("::warning::Issue #16 is approved, but its JSON block can't be read");
    expect(log).toContain("::warning::A line of the issues file isn't JSON");
    expect(log).toContain("2 approved suggestions written, 1 unreadable, 1 open ones await a verdict");
    expect(log).toContain(`::notice::1 usulan masjid menunggu label ${APPROVED_LABEL} atau ${REJECTED_LABEL}`);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes an empty file when no issue is approved", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contrib-"));
    const input = path.join(dir, "suggestions.jsonl");
    const output = path.join(dir, "contrib.jsonl");
    fs.writeFileSync(input, "");
    const script = path.join(process.cwd(), "scripts", "mosque-data", "contributions.mjs");
    execFileSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", script, input, output], { encoding: "utf8" });
    expect(fs.readFileSync(output, "utf8")).toBe("");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
