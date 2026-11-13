#!/usr/bin/env bash
# Feature 002 checks (local only). Run from anywhere: bash docs/test-002.sh [PR#]   (default PR 1)
set -uo pipefail
cd "$(dirname "$0")/.."
PR="${1:-1}"
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
warn() { echo "⚠ $1"; }
trailer() { npm run -s trailer -- "$@"; }

[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1
npx tsc --noEmit >/dev/null 2>&1 && pass "typecheck" || fail "typecheck (run: npx tsc --noEmit)"
trailer --help | grep -q "Usage:" && pass "--help" || fail "--help"
trailer "$PR" --stage nope >/dev/null 2>&1 && fail "unknown stage accepted" || pass "unknown stage rejected"

# Route mapping (offline, no GitHub needed)
node --input-type=module --eval '
  const { mapRoutes } = await import("./src/stages/context.ts");
  const { loadConfig } = await import("./src/lib/config.ts");
  const cfg = await loadConfig();
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ok =
    eq(mapRoutes(["apps/demo-app/src/pricing.ts"], cfg), { routes: ["/pricing.html"], routeReason: "matched" }) &&
    eq(mapRoutes(["apps/demo-app/styles.css"], cfg).routeReason, "global-source") &&
    eq(mapRoutes(["README.md"], cfg).routeReason, "fallback-all");
  process.exit(ok ? 0 : 1);' 2>/dev/null && pass "route mapping (matched / global-source / fallback-all)" || fail "route mapping"

# Real PR (needs gh login + the demo PR from feature 001)
if gh pr view "$PR" --json number >/dev/null 2>&1; then
  trailer "$PR" --stage context --force >/dev/null && [ -f ".trailer/$PR/context.json" ] && pass "context.json written for PR #$PR" || fail "context stage failed for PR #$PR"
  node -e "const c=require('./.trailer/$PR/context.json'); process.exit(c.routes.includes('/pricing.html')?0:1)" \
    && pass "routes include /pricing.html" || warn "routes don't include /pricing.html (expected only for the pricing PR)"
  trailer "$PR" --stage context | grep -q "(cached)" && pass "second run is cached" || fail "second run not cached"
  trailer "$PR" --stage context --force | grep -q "✔ context" && pass "--force re-runs" || fail "--force did not re-run"
  { trailer "$PR" || true; } | grep -q "not implemented" && pass "pipeline stops at the first stage not built yet" || warn "every stage is implemented (no stub left)"
else
  warn "PR #$PR not found via gh — skipping live checks (run .demo-patches/setup-demo-prs.sh first)"
fi
trailer 999999 --stage context >/dev/null 2>&1; [ $? -eq 1 ] && pass "missing PR → exit code 1 with re-run hint" || fail "missing PR did not fail cleanly"
rm -rf .trailer/999999

[ "$FAILED" = 0 ] && echo "All feature 002 checks passed." || { echo "Some checks failed."; exit 1; }
