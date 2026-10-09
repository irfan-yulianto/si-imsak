#!/usr/bin/env bash
# Synthetic checks: production as a visitor gets it, and the upstream APIs it relies
# on. Run by .github/workflows/synthetic.yml.
#
#   scripts/synthetic.sh hourly   the site (headers, region, schedule, mosques, assets) and
#                                 MyQuran's contract (monthly, daily, city search)
#   scripts/synthetic.sh daily    Nominatim, whose usage policy asks for few requests,
#                                 and a probe of MyQuran's Hijri dates
#
# Each check prints one line, and a table row to $GITHUB_STEP_SUMMARY when set.
# Failed checks are also appended to $FAILURES_FILE (when set) for the issue the
# workflow opens; the exit status is then 1.
#
# Settings (defaults: production):
#   SITE_URL       the deployed site
#   MYQURAN_API    MyQuran's prayer-schedule API
#   NOMINATIM_URL  Nominatim reverse geocoding
#   EXPECT_REGION  Vercel function region; empty skips the check (local runs)
#   SYNTHETIC_TOKEN  sent to the site only, as the x-synthetic-monitor header, so a
#                  Vercel Firewall bypass rule can let the monitor through (README)
set -uo pipefail

MODE="${1:-hourly}"
SITE_URL="${SITE_URL:-https://si-imsak.vercel.app}"
MYQURAN_API="${MYQURAN_API:-https://api.myquran.com/v3/sholat}"
NOMINATIM_URL="${NOMINATIM_URL:-https://nominatim.openstreetmap.org/reverse}"
EXPECT_REGION="${EXPECT_REGION-sin1}"

UA="Si-Imsak-Synthetic/1.0 (+https://github.com/irfan-yulianto/si-imsak)"
# The app's default city (KOTA JAKARTA) and a point in it
JAKARTA="58a2fc6ed39fd083f55d4182bf88826d"
LAT="-6.1754"
LNG="106.8272"

# Dates in WIB, the default city's time zone
TODAY=$(TZ=Asia/Jakarta date +%F)
THIS_MONTH=${TODAY:0:7}
NEXT_MONTH=$(date -d "$THIS_MONTH-01 +1 month" +%Y-%m)
DAY_OF_MONTH=$((10#${TODAY:8:2}))

# An upstream day: a date label and the eight times as HH:MM
JQ_DAY='(.tanggal | type == "string") and ([.imsak, .subuh, .terbit, .dhuha, .dzuhur, .ashar, .maghrib, .isya] | all(type == "string" and test("^([01][0-9]|2[0-3]):[0-5][0-9]$")))'

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
FAILED=0
CHECK=""
SITE_HEADERS=()
if [[ -n "${SYNTHETIC_TOKEN:-}" ]]; then
  SITE_HEADERS=(-H "x-synthetic-monitor: $SYNTHETIC_TOKEN")
fi

days_in() { date -d "$1-01 +1 month -1 day" +%-d; }

# get URL [curl options…]: sets STATUS; the body lands in $TMP/body, headers in $TMP/headers
get() {
  local url=$1
  shift
  : >"$TMP/headers"
  : >"$TMP/body"
  STATUS=$(curl -sS --max-time 25 -A "$UA" -D "$TMP/headers" -o "$TMP/body" -w '%{http_code}' "$@" "$url" 2>/dev/null) || STATUS="000"
}

header() { grep -i "^$1:" "$TMP/headers" | tail -n 1 | cut -d' ' -f2- | tr -d '\r'; }

# site PATH [curl options…]: get() on the site, with the monitor's bypass header
site() {
  local path=$1
  shift
  get "$SITE_URL$path" ${SITE_HEADERS[@]+"${SITE_HEADERS[@]}"} "$@"
}

# The Vercel firewall answers clients it doesn't trust with a challenge page
challenged() {
  [[ -n $(header x-vercel-mitigated) ]] ||
    { [[ $STATUS == 429 || $STATUS == 403 ]] && grep -q "Vercel Security Checkpoint" "$TMP/body"; }
}

# The start of the last body, safe to quote in Markdown
snippet() { head -c 160 "$TMP/body" | tr -d '\r`' | tr '\n|' '  ' | tr -cd '[:print:]'; }

row() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "| $1 | $CHECK | ${2//|/\\|} |" >>"$GITHUB_STEP_SUMMARY"
  fi
}

ok() {
  echo "✅ $CHECK${1:+ — $1}"
  row "✅" "${1:-}"
}

info() {
  echo "ℹ️  $CHECK — $1"
  row "ℹ️" "$1"
}

bad() {
  echo "❌ $CHECK — $1"
  row "❌" "$1"
  FAILED=1
  if [[ -n "${FAILURES_FILE:-}" ]]; then
    echo "- **$CHECK**: $1" >>"$FAILURES_FILE"
  fi
}

# --- The site ---------------------------------------------------------------

site_page() {
  CHECK="page and headers"
  site "/"
  if challenged; then
    bad "the Vercel firewall challenged the monitor (HTTP $STATUS, x-vercel-mitigated: $(header x-vercel-mitigated)), so the site itself was not checked. Add the bypass rule from README → Synthetic monitoring"
    return 1
  fi
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS"; return; }
  local missing=() csp
  csp=$(header content-security-policy)
  [[ $csp == *"frame-ancestors 'none'"* && $csp == *"script-src-attr 'none'"* ]] || missing+=("content-security-policy")
  [[ $(header strict-transport-security) == *max-age=* ]] || missing+=("strict-transport-security")
  [[ $(header x-content-type-options) == nosniff ]] || missing+=("x-content-type-options")
  [[ $(header x-frame-options) == DENY ]] || missing+=("x-frame-options")
  [[ $(header cross-origin-opener-policy) == same-origin ]] || missing+=("cross-origin-opener-policy")
  [[ $(header permissions-policy) == *"geolocation=(self)"* ]] || missing+=("permissions-policy")
  [[ -z $(header x-powered-by) ]] || missing+=("x-powered-by is sent")
  [[ -n $(header x-app-version) ]] || missing+=("x-app-version")
  grep -q "Hitung mundur waktu sholat" "$TMP/body" || missing+=("page content")
  if ((${#missing[@]})); then
    bad "missing or wrong: ${missing[*]}"
  else
    ok "version $(header x-app-version)"
  fi
}

site_time() {
  CHECK="server time and region"
  local before after now skew id region
  before=$(date +%s%3N)
  site "/api/time"
  after=$(date +%s%3N)
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS"; return; }
  now=$(jq -e '.now | numbers' "$TMP/body" 2>/dev/null) || { bad "no time in \`$(snippet)\`"; return; }
  skew=$((now - (before + after) / 2))
  ((${skew#-} < 30000)) || { bad "server clock off by $skew ms"; return; }
  [[ $(header cache-control) == *no-store* ]] || { bad "cacheable: $(header cache-control)"; return; }
  if [[ -n $EXPECT_REGION ]]; then
    # e.g. "iad1::sin1::abcde-…": the last region is where the function ran
    id=$(header x-vercel-id)
    region=$(awk -F'::' 'NF >= 3 { print $(NF - 1) }' <<<"$id")
    [[ $region == "$EXPECT_REGION" ]] || { bad "function ran in ${region:-?} (x-vercel-id ${id:-missing}), expected $EXPECT_REGION"; return; }
  fi
  ok "clock skew $skew ms${EXPECT_REGION:+, function region $EXPECT_REGION}"
}

site_schedule() {
  CHECK="schedule API"
  local days
  days=$(days_in "$THIS_MONTH")
  site "/api/schedule?city_id=$JAKARTA&year=${THIS_MONTH:0:4}&month=$((10#${THIS_MONTH:5:2}))"
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS: \`$(snippet)\`"; return; }
  jq -e --argjson days "$days" "
    .status == true and (.partial | not) and (.data.jadwal | length == \$days)
    and (.data.jadwal | all($JQ_DAY))" "$TMP/body" >/dev/null 2>&1 ||
    { bad "$THIS_MONTH incomplete or malformed: \`$(snippet)\`"; return; }
  local cache
  cache=$(header x-vercel-cache)
  ok "$THIS_MONTH, $days days${cache:+, CDN $cache}"
}

# The mosques near Monas, from the dataset the workflow "Mosque data" rebuilds weekly
site_mosques() {
  CHECK="mosque API"
  site "/api/mosques?lat=-6.18&lng=106.83"
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS: \`$(snippet)\`"; return; }
  local count date age
  count=$(jq -r 'if .status == true then (.data | length) else -1 end' "$TMP/body" 2>/dev/null || echo -1)
  ((count >= 10)) || { bad "$count mosques near Monas: \`$(snippet)\`"; return; }
  date=$(header x-data-date)
  [[ -n $date ]] || { bad "no X-Data-Date: the dataset's date is unknown"; return; }
  age=$((($(date -u +%s) - $(date -u -d "$date" +%s)) / 86400))
  ((age <= 21)) || { bad "the data is $age days old (OpenStreetMap of $date): is the workflow Mosque data running?"; return; }
  ok "$count near Monas, OpenStreetMap of $date ($age days)"
}

site_files() {
  CHECK="static files"
  local problems=() expires
  site "/sw.js"
  [[ $STATUS == 200 ]] && grep -q "si-imsak-" "$TMP/body" || problems+=("sw.js (HTTP $STATUS)")
  site "/manifest.webmanifest"
  [[ $STATUS == 200 ]] && jq -e '.name and (.icons | length > 0)' "$TMP/body" >/dev/null 2>&1 || problems+=("manifest (HTTP $STATUS)")
  site "/opengraph-image"
  [[ $STATUS == 200 && $(header content-type) == image/png* ]] || problems+=("opengraph-image (HTTP $STATUS)")
  site "/.well-known/security.txt"
  if [[ $STATUS == 200 ]] && grep -q "^Contact:" "$TMP/body"; then
    # RFC 9116: the file is void once Expires has passed
    expires=$(grep -i "^Expires:" "$TMP/body" | cut -d' ' -f2 | tr -d '\r')
    if [[ -z $expires ]] || (($(date -d "$expires" +%s 2>/dev/null || echo 0) < $(date -d "+30 days" +%s))); then
      problems+=("security.txt expires ${expires:-never set}: renew it")
    fi
  else
    problems+=("security.txt (HTTP $STATUS)")
  fi
  if ((${#problems[@]})); then
    bad "${problems[*]}"
  else
    ok "sw.js, manifest, opengraph-image, security.txt"
  fi
}

# --- MyQuran (prayer times and cities) ---------------------------------------

# The app asks for a whole month at once and falls back to single days
myquran_month() {
  CHECK=$1
  local period=$2 days
  days=$(days_in "$period")
  get "$MYQURAN_API/jadwal/$JAKARTA/$period" -H "Accept: application/json"
  [[ $STATUS == 200 ]] || { bad "$period: HTTP $STATUS \`$(snippet)\`"; return; }
  jq -e --argjson days "$days" --arg p "$period" "
    .status == true and (.data.kabko | type == \"string\") and (.data.jadwal | type == \"object\")
    and ([.data.jadwal | keys[] | select(startswith(\$p))] | length == \$days)
    and ([.data.jadwal[]] | all($JQ_DAY))" "$TMP/body" >/dev/null 2>&1 ||
    { bad "$period incomplete or malformed: \`$(snippet)\`"; return; }
  ok "$period, $days days"
}

myquran_day() {
  CHECK="MyQuran day"
  get "$MYQURAN_API/jadwal/$JAKARTA/$TODAY" -H "Accept: application/json"
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS \`$(snippet)\`"; return; }
  jq -e --arg d "$TODAY" ".status == true and (.data.jadwal[\$d] | $JQ_DAY)" "$TMP/body" >/dev/null 2>&1 ||
    { bad "$TODAY malformed: \`$(snippet)\`"; return; }
  ok "$TODAY"
}

myquran_city_search() {
  CHECK="MyQuran city search"
  get "$MYQURAN_API/kota/cari/jakarta" -H "Accept: application/json"
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS \`$(snippet)\`"; return; }
  jq -e '.status == true and (.data | type == "array" and length > 0)
    and all(.data[]; (.id | type == "string" and test("^[a-f0-9]{32}$")) and (.lokasi | type == "string"))' \
    "$TMP/body" >/dev/null 2>&1 || { bad "malformed: \`$(snippet)\`"; return; }
  ok "$(jq '.data | length' "$TMP/body") results for \"jakarta\""
}

# Never fails: tells whether MyQuran serves Hijri dates (the app computes Umm al-Qura)
myquran_hijri() {
  CHECK="MyQuran Hijri dates"
  local base=${MYQURAN_API%/sholat} url
  for url in "$base/cal/hijr/$TODAY" "${base%/v3}/v2/cal/hijr/$TODAY"; do
    get "$url" -H "Accept: application/json"
    info "$url → HTTP $STATUS \`$(snippet)\`"
  done
}

# --- Geocoding and mosques ---------------------------------------------------

nominatim() {
  CHECK="Nominatim"
  get "$NOMINATIM_URL?lat=$LAT&lon=$LNG&format=json&zoom=10&addressdetails=1&accept-language=id"
  [[ $STATUS == 200 ]] || { bad "HTTP $STATUS \`$(snippet)\`"; return; }
  jq -e '.address | type == "object" and ((.city // .state // "") | test("jakarta"; "i"))' "$TMP/body" >/dev/null 2>&1 ||
    { bad "no Jakarta address: \`$(snippet)\`"; return; }
  ok "$(jq -r '.address.city // .address.state' "$TMP/body")"
}

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '\n### Synthetic checks (%s)\n\n|  | Check | Result |\n|---|---|---|\n' "$MODE" >>"$GITHUB_STEP_SUMMARY"
fi

case $MODE in
  hourly)
    # A firewall challenge on the page means the other site checks would see the same
    if site_page; then
      site_time
      site_schedule
      site_mosques
      site_files
    fi
    myquran_month "MyQuran month" "$THIS_MONTH"
    # Late in the month the app already shows next month (in December: next year's January)
    if ((DAY_OF_MONTH > 20)); then myquran_month "MyQuran next month" "$NEXT_MONTH"; fi
    myquran_day
    myquran_city_search
    ;;
  daily)
    nominatim
    myquran_hijri
    ;;
  *)
    echo "usage: $0 hourly|daily" >&2
    exit 2
    ;;
esac

exit "$FAILED"
