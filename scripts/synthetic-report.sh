#!/usr/bin/env bash
# Keeps one GitHub issue per kind of synthetic check in step with the latest run:
# opened when the checks fail, a reminder at most every 6 hours while they keep
# failing, closed once they pass. Run by .github/workflows/synthetic.yml.
#
#   scripts/synthetic-report.sh KIND RESULT
#     KIND    hourly | daily
#     RESULT  the checks job's result: success | failure | cancelled | skipped
#
# Environment: GH_TOKEN, GH_REPO, RUN_URL, and FAILURES (a Markdown list, may be empty)
set -euo pipefail

KIND=$1
RESULT=$2
LABEL="synthetic-failure"
TITLE="Synthetic monitor: $KIND checks failing"
REMIND_AFTER_S=$((6 * 3600))
DETAILS="${FAILURES:-}"
DETAILS="${DETAILS:-See the run for details.}"

# Only a finished run says something about the site
if [[ $RESULT != success && $RESULT != failure ]]; then
  echo "$KIND checks: $RESULT, nothing to report"
  exit 0
fi

issue=$(gh issue list --label "$LABEL" --state open --json number,title \
  --jq "map(select(.title == \"$TITLE\")) | first | .number // empty")

if [[ $RESULT == success ]]; then
  if [[ -n $issue ]]; then
    gh issue close "$issue" --comment "The $KIND checks pass again: $RUN_URL"
  fi
  exit 0
fi

if [[ -z $issue ]]; then
  gh label create "$LABEL" --force --color B60205 --description "Opened by the synthetic monitor" >/dev/null
  gh issue create --title "$TITLE" --label "$LABEL" --body "The synthetic monitor's $KIND checks failed:

$DETAILS

Run: $RUN_URL

While the checks keep failing, this issue gets a reminder at most every 6 hours. It closes itself once they pass."
  exit 0
fi

last=$(gh issue view "$issue" --json createdAt,comments --jq '[.createdAt, .comments[].createdAt] | max')
if (($(date +%s) - $(date -d "$last" +%s) >= REMIND_AFTER_S)); then
  gh issue comment "$issue" --body "Still failing:

$DETAILS

Run: $RUN_URL"
else
  echo "$KIND checks still failing; issue #$issue was last updated $last"
fi
