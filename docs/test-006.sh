#!/usr/bin/env bash
# Feature 006 checks (local only). Run from anywhere: bash docs/test-006.sh [PR#]   (default PR 1)
# NOTE: this writes to GitHub — it uploads to the `trailers` release and posts/edits ONE comment on the PR.
set -uo pipefail
cd "$(dirname "$0")/.."
PR="${1:-1}"
OUT=".trailer/$PR"
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
warn() { echo "⚠ $1"; }
trailer() { npm run -s trailer -- "$@"; }

npx tsc --noEmit >/dev/null 2>&1 && pass "typecheck" || fail "typecheck (run: npx tsc --noEmit)"
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || { fail "gh not logged in or not in a GitHub repo"; exit 1; }
[ "$(gh repo view --json visibility -q .visibility)" = "PUBLIC" ] && pass "$REPO is public (GIF renders inline)" || warn "$REPO is not public: the GIF won't render inline"

echo "… making sure the trailer exists (runs earlier stages if needed)"
for s in context capture narrate render; do trailer "$PR" --stage "$s" >/dev/null || fail "stage $s failed"; done

echo "… publishing to PR #$PR (run 1)"
trailer "$PR" --stage publish --force || fail "publish failed"
[ -f "$OUT/published.json" ] && pass "published.json written" || fail "no $OUT/published.json"
url=$(node -e "console.log(require('./$OUT/published.json').commentUrl)" 2>/dev/null)
echo "  comment: $url"

count() { gh api "repos/$REPO/issues/$PR/comments" --paginate --jq '[.[] | select(.body | contains("<!-- pr-trailer -->"))] | length' | awk '{s+=$1} END {print s+0}'; }
echo "… publishing again (run 2 must edit the same comment)"
trailer "$PR" --stage publish --force >/dev/null || fail "second publish failed"
[ "$(node -e "console.log(require('./$OUT/published.json').action)")" = "updated" ] && pass "second run updated the comment" || fail "second run did not update"
n=$(count); [ "$n" = "1" ] && pass "exactly 1 PR Trailers comment on PR #$PR" || fail "$n PR Trailers comments on PR #$PR (expected 1)"

for kind in mp4 gif poster; do
  asset=$(node -e "console.log(require('./$OUT/published.json').assets.$kind)")
  code=$(curl -s -o /dev/null -w '%{http_code}' -L "$asset")
  [ "$code" = "200" ] && pass "$kind downloads (HTTP 200)" || fail "$kind → HTTP $code ($asset)"
done

body=$(gh api "repos/$REPO/issues/$PR/comments" --paginate --jq '.[] | select(.body | contains("<!-- pr-trailer -->")) | .body')
echo "$body" | grep -q "preview.gif" && echo "$body" | grep -q "trailer.mp4" && pass "comment has the GIF and the MP4 link" || fail "comment body missing GIF or MP4 link"
echo "$body" | grep -q "Risks" && pass "comment lists the risks" || warn "no risks section (expected for PR #1)"

trailer "$PR" --stage publish | grep -q "(cached)" && pass "third run is cached" || fail "third run not cached"

[ "$FAILED" = 0 ] && echo "All feature 006 checks passed. Open the PR: gh pr view $PR --web" || { echo "Some checks failed."; exit 1; }
