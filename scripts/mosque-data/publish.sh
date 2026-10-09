#!/usr/bin/env bash
# After build.sh (in mosque-data.yml): proposes the new dataset as a pull request from
# the branch data/mosques, runs CI on it, and merges it once CI passes. The first
# dataset, and any a ruleset keeps from merging, waits for a person instead.
# Needs GH_TOKEN, and $RUNNER_TEMP/summary.md from validate.mjs.
set -euo pipefail

branch=data/mosques
file=data/mosques.tsv

if git diff --quiet -- "$file" && git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
  echo "The dataset didn't change."
  exit 0
fi
first=false
git cat-file -e "HEAD:$file" 2>/dev/null || first=true

date=$(date -u +%Y-%m-%d)
title="chore(data): data masjid OpenStreetMap dan Overture $date"
{
  echo "Pembaruan mingguan data masjid dan musholla dari OpenStreetMap dan Overture Maps, dibuat oleh workflow **Mosque data**."
  echo
  cat "$RUNNER_TEMP/summary.md"
  echo
  echo "Data © kontributor OpenStreetMap ([ODbL](https://opendatacommons.org/licenses/odbl/1-0/)) dan Overture Maps Foundation ([CDLA-Permissive-2.0](https://cdla.dev/permissive-2-0/)); lihat \`data/LICENSE\`."
} > "$RUNNER_TEMP/body.md"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git switch -C "$branch"
git add data/
git commit -q -m "$title"
git push -q --force origin "$branch"

pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number // empty')
if [[ -z $pr ]]; then
  if ! gh pr create --base main --head "$branch" --title "$title" --body-file "$RUNNER_TEMP/body.md"; then
    echo "::warning::The branch $branch has the new dataset, but no pull request could be opened. Allow GitHub Actions to create pull requests (Settings → Actions → General → Workflow permissions), or open one by hand."
    exit 0
  fi
  pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number')
else
  gh pr edit "$pr" --title "$title" --body-file "$RUNNER_TEMP/body.md"
fi

# Pull requests opened with the workflow's token don't start CI by themselves
gh workflow run ci.yml --ref "$branch"
if $first; then
  echo "::notice::The first dataset (PR #$pr) waits for a person to check and merge it."
  exit 0
fi

# The run just started for the branch's head
sha=$(git rev-parse HEAD)
for _ in $(seq 30); do
  run=$(gh run list --workflow ci.yml --branch "$branch" --event workflow_dispatch --commit "$sha" --limit 1 --json databaseId --jq '.[0].databaseId // empty')
  [[ -n $run ]] && break
  sleep 10
done
if [[ -z ${run:-} ]]; then
  echo "::warning::CI didn't start on PR #$pr: it waits for a person."
  exit 0
fi
if ! gh run watch "$run" --exit-status --interval 30 >/dev/null; then
  echo "::error::CI failed on the dataset of PR #$pr."
  exit 1
fi
gh pr merge "$pr" --merge --delete-branch \
  || echo "::notice::PR #$pr passed CI but couldn't be merged (a ruleset may ask for a review): it waits for a person."
