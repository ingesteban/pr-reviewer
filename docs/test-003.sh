#!/usr/bin/env bash
# Feature 003 checks (local only). Run from anywhere: bash docs/test-003.sh [PR#]   (default PR 1)
# Needs: gh logged in, the demo PR from 001, and Chromium (npx playwright install chromium).
set -uo pipefail
cd "$(dirname "$0")/.."
PR="${1:-1}"
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
trailer() { npm run -s trailer -- "$@"; }

[ -d node_modules/playwright ] || { echo "… installing dependencies"; npm install --no-audit --no-fund; }
[ -d apps/demo-app/node_modules ] || { echo "… installing demo-app dependencies"; (cd apps/demo-app && npm install --no-audit --no-fund); }
npx tsc --noEmit >/dev/null 2>&1 && pass "typecheck" || fail "typecheck (run: npx tsc --noEmit)"

status_before=$(git status --porcelain --untracked-files=no)
branch_before=$(git branch --show-current)

echo "… context + capture for PR #$PR (builds base and head, takes ~10-60 s)"
trailer "$PR" --stage context >/dev/null || fail "context stage failed"
start=$(date +%s)
if trailer "$PR" --stage capture --force; then
  pass "capture finished in $(( $(date +%s) - start ))s"
else
  fail "capture stage failed"
fi

OUT=".trailer/$PR"
if [ -f "$OUT/changes.json" ]; then
  node --input-type=module -e "
    import { readFileSync, existsSync } from 'node:fs';
    const { captures } = JSON.parse(readFileSync('$OUT/changes.json', 'utf8'));
    const problems = [];
    for (const c of captures) for (const f of [c.base, c.head, c.diff]) if (!existsSync('$OUT/' + f)) problems.push('missing ' + f);
    for (const id of ['pricing.desktop', 'pricing.mobile']) {
      const c = captures.find((x) => x.id === id);
      if (!c) problems.push(id + ' not captured');
      else if (c.unchanged || c.boxes.length === 0) problems.push(id + ' should be changed with boxes');
    }
    const sorted = captures.every((c, i) => i === 0 || captures[i - 1].diffRatio >= c.diffRatio);
    if (!sorted) problems.push('captures not sorted by diffRatio');
    console.log(captures.map((c) => '  ' + c.id + ' ' + (c.diffRatio * 100).toFixed(1) + '% ' + (c.unchanged ? 'unchanged' : c.boxes.length + ' boxes')).join('\n'));
    if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
  " && pass "changes.json valid (pricing desktop + mobile changed, PNGs present, sorted)" || fail "changes.json content"
else
  fail "no $OUT/changes.json"
fi

# Cleanup and isolation (constitution Art. XI)
[ "$(git worktree list | wc -l | tr -d ' ')" = "1" ] && pass "worktrees removed" || fail "leftover worktrees: $(git worktree list)"
[ -z "$(git for-each-ref refs/trailer)" ] && pass "temporary PR ref removed" || fail "leftover refs/trailer/*"
lsof -ti tcp:4173 tcp:4174 >/dev/null 2>&1 && fail "preview server still running on 4173/4174" || pass "ports 4173/4174 free"
[ "$(git branch --show-current)" = "$branch_before" ] && [ "$(git status --porcelain --untracked-files=no)" = "$status_before" ] \
  && pass "your branch and working tree untouched" || fail "working tree or branch changed"

trailer "$PR" --stage capture | grep -q "(cached)" && pass "second run is cached" || fail "second run not cached"

[ "$FAILED" = 0 ] && echo "All feature 003 checks passed. Look at $OUT/shots/pricing.mobile.diff.png to see the mobile bug." || { echo "Some checks failed."; exit 1; }
