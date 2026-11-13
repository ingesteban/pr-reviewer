#!/usr/bin/env bash
# Feature 001 checks (local only). Run from anywhere: bash docs/test-001.sh
set -uo pipefail
cd "$(dirname "$0")/.."
APP=apps/demo-app
PORT=4173
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
warn() { echo "⚠ $1"; }

# 1. Build on the current branch
if (cd "$APP" && npm install --prefer-offline --no-audit --no-fund >/dev/null 2>&1 && npm run build >/dev/null 2>&1); then
  pass "build ($(git branch --show-current))"
else
  fail "build failed — run: cd $APP && npm run build"
fi

# 2. Preview serves both routes
lsof -ti :"$PORT" | xargs kill 2>/dev/null || true
(cd "$APP" && exec node node_modules/vite/bin/vite.js preview --port "$PORT" --strictPort >/tmp/demo-preview.log 2>&1) &
SERVER=$!
for _ in $(seq 1 30); do curl -sf "http://localhost:$PORT/" >/dev/null && break; sleep 0.5; done
for route in / /pricing.html; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$route")
  [ "$code" = "200" ] && pass "GET $route → 200" || fail "GET $route → $code"
done

# 3. Mobile regression on the demo PR branch (only if Playwright is installed; it arrives in feature 003)
if git rev-parse --abbrev-ref HEAD | grep -q '^feat/pricing-redesign$'; then
  if node --input-type=module -e "await import('playwright')" 2>/dev/null; then
    width=$(node --input-type=module -e "
      const { chromium } = await import('playwright');
      const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
      await p.goto('http://localhost:$PORT/pricing.html');
      console.log(await p.evaluate(() => document.documentElement.scrollWidth)); await b.close();")
    [ "$width" -gt 390 ] && pass "mobile regression present (page is ${width}px wide at 390px)" || fail "mobile regression missing (scrollWidth $width)"
  else
    warn "Playwright not installed yet — check manually: DevTools at 390px on /pricing.html should overflow"
  fi
fi
kill "$SERVER" 2>/dev/null || true

# 4. Git + GitHub state
git rev-parse --verify -q main >/dev/null && pass "main exists" || fail "no main branch"
for branch in feat/pricing-redesign feat/hero-copy; do
  git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1 && pass "origin/$branch pushed" || fail "origin/$branch not pushed"
done
if command -v gh >/dev/null; then
  open_prs=$(gh pr list --state open --json headRefName -q '.[].headRefName' 2>/dev/null)
  echo "$open_prs" | grep -qx 'feat/pricing-redesign' && pass "PR for feat/pricing-redesign is open" || fail "no open PR for feat/pricing-redesign"
  echo "$open_prs" | grep -qx 'feat/hero-copy' && pass "PR for feat/hero-copy is open" || warn "no open PR for feat/hero-copy (backup PR, optional)"
else
  fail "gh CLI not found"
fi

[ "$FAILED" = 0 ] && echo "All feature 001 checks passed." || { echo "Some checks failed."; exit 1; }
