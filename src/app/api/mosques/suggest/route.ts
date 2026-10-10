import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadMosqueData } from "@/lib/mosque-index";
import { INDONESIA_BOUNDS, NO_STORE } from "@/lib/constants";
import { json, tooManyRequests, upstreamFetch } from "@/lib/http";
import { SUGGESTION_GITHUB_API, SUGGESTION_GITHUB_REPO, suggestionToken } from "@/lib/upstream";
import { log, errorMessage } from "@/lib/log";
import { isObject, parseSuggestion } from "@/lib/validate";
import { SHARP_M } from "@/lib/geofix";
import { classifyType, isIslamicName } from "@/lib/mosque-osm";
import { MAX_OPEN_SUGGESTIONS, NEAR_PLACE_M, SUGGESTION_LABEL, suggestionBody, suggestionTitle, type Suggestion } from "@/lib/mosque-contrib";
import { MOSQUE_MESSAGES, suggestionExists } from "@/lib/mosque-messages";
import type { SuggestionResponse } from "@/types";

/** The whole request: two calls to GitHub and, on a cold start, loading the dataset */
export const maxDuration = 15;
const TIMEOUT_MS = 12_000;
/** Each call to GitHub */
const GITHUB_TIMEOUT_MS = 5_000;
/** A suggestion is a few hundred bytes of JSON; anything bigger isn't one */
const MAX_BODY_BYTES = 2_048;

const fail = (error: string, status: number, retryable = false) =>
  json<SuggestionResponse>({ status: false, error, ...(retryable && { retryable: true }) }, { status, cache: NO_STORE });

/** Five decimals (~1 m): what the issue holds, and all a suggestion needs */
const round5 = (degrees: number) => Math.round(degrees * 1e5) / 1e5;

/** GitHub didn't take the issue: what to tell the user, and the log */
function githubFailed(res: Response) {
  log("error", { route: "suggest", upstreamStatus: res.status });
  // The token expired or isn't for this repository: nothing to retry until the owner acts
  if (res.status === 401 || res.status === 404) return fail(MOSQUE_MESSAGES.suggestionsOff, 503);
  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    return json<SuggestionResponse>(
      { status: false, error: MOSQUE_MESSAGES.serviceBusy, retryable: true },
      { status: 503, cache: NO_STORE, ...(retryAfter && { headers: { "Retry-After": retryAfter } }) }
    );
  }
  if (res.status === 422) return fail(MOSQUE_MESSAGES.suggestionInvalid, 502);
  return fail(MOSQUE_MESSAGES.serviceBusy, 502, true);
}

/**
 * A user's suggestion of a mosque or musholla that isn't listed, sent from the place
 * itself (a fix accurate to SHARP_M, no listed place within NEAR_PLACE_M): becomes an
 * issue of the repository, labelled for the owner to check (src/lib/mosque-contrib.ts);
 * the weekly build takes the approved ones. Nothing about the sender goes into the
 * issue. Off until SUGGESTION_GITHUB_TOKEN is set.
 */
export async function POST(request: NextRequest) {
  // Only the app's own page sends JSON here: a form on another site can't, and a script
  // on another origin is stopped by the preflight this route doesn't answer
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return fail(MOSQUE_MESSAGES.suggestionRejected, 403);
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return fail(MOSQUE_MESSAGES.suggestionRejected, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(MOSQUE_MESSAGES.suggestionRejected, 413);

  const limit = checkRateLimit(request, "suggest");
  if (!limit.ok) return tooManyRequests<SuggestionResponse>({ status: false, error: MOSQUE_MESSAGES.tooManyRequests }, limit.retryAfterS);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(MOSQUE_MESSAGES.suggestionRejected, 413);
    body = JSON.parse(text);
  } catch {
    return fail(MOSQUE_MESSAGES.suggestionRejected, 400);
  }
  const input = parseSuggestion(body);
  if (!input) return fail(MOSQUE_MESSAGES.suggestionInvalid, 400);
  const { latMin, latMax, lngMin, lngMax } = INDONESIA_BOUNDS;
  if (input.lat < latMin || input.lat > latMax || input.lng < lngMin || input.lng > lngMax) {
    return fail(MOSQUE_MESSAGES.suggestionInvalid, 400);
  }
  if (input.accuracy > SHARP_M) return fail(MOSQUE_MESSAGES.suggestionNeedsSharpFix, 400);

  // The kind chosen gives the name its first word, unless it already starts like a mosque's
  const name = isIslamicName(input.name) ? input.name : `${input.kind === "musholla" ? "Musholla" : "Masjid"} ${input.name}`;
  const suggestion: Suggestion = {
    type: classifyType({ name }),
    name,
    ...(input.street && { street: input.street }),
    lat: round5(input.lat),
    lng: round5(input.lng),
    accuracy: Math.round(input.accuracy),
    at: new Date().toISOString(),
  };

  const token = suggestionToken();
  if (!token) return fail(MOSQUE_MESSAGES.suggestionsOff, 503);

  // Already in the data: a duplicate would only cost the owner a look
  const data = await loadMosqueData();
  if (!data) return fail(MOSQUE_MESSAGES.serviceBusy, 503, true);
  const listed = data.index.nearest(suggestion.lat, suggestion.lng, { minReach: NEAR_PLACE_M, maxReach: NEAR_PLACE_M, minCount: 1, maxCount: 1 }).mosques[0];
  if (listed) return fail(suggestionExists(listed.name), 409);

  const deadline = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]);
  const github = (path: string, init: { method?: string; body?: string } = {}) =>
    upstreamFetch(`${SUGGESTION_GITHUB_API}/repos/${SUGGESTION_GITHUB_REPO}${path}`, {
      ...init,
      signal: deadline,
      timeoutMs: GITHUB_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body && { "Content-Type": "application/json" }),
      },
    });
  try {
    // A backlog the owner hasn't looked at takes no more (the issues API lists pull requests too)
    const open = await github(`/issues?labels=${SUGGESTION_LABEL}&state=open&per_page=100`);
    if (!open.ok) return githubFailed(open);
    const issues: unknown = await open.json();
    const backlog = Array.isArray(issues) ? issues.filter((issue) => isObject(issue) && !("pull_request" in issue)).length : 0;
    if (backlog >= MAX_OPEN_SUGGESTIONS) return fail(MOSQUE_MESSAGES.suggestionsFull, 503, true);

    // Never retried: a timeout after the issue was created would make a second one
    const created = await github("/issues", {
      method: "POST",
      body: JSON.stringify({ title: suggestionTitle(suggestion), body: suggestionBody(suggestion), labels: [SUGGESTION_LABEL] }),
    });
    if (!created.ok) return githubFailed(created);
    const issue: unknown = await created.json();
    const number = isObject(issue) && typeof issue.number === "number" ? issue.number : 0;
    log("info", { route: "suggest", number });
    return json<SuggestionResponse>({ status: true, data: { number } }, { cache: NO_STORE });
  } catch (err) {
    log("error", { route: "suggest", error: errorMessage(err) });
    return fail(MOSQUE_MESSAGES.serviceBusy, 502, true);
  }
}
