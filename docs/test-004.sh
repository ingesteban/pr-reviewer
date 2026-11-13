#!/usr/bin/env bash
# Feature 004 checks (local only). Run from anywhere: bash docs/test-004.sh [PR#]   (default PR 1)
# Needs: features 001-003 working, and GEMINI_API_KEY in .env for the live checks.
set -uo pipefail
cd "$(dirname "$0")/.."
PR="${1:-1}"
OUT=".trailer/$PR"
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
warn() { echo "⚠ $1"; }
trailer() { npm run -s trailer -- "$@"; }
field() { node -e "const s=require('./$OUT/script.json'); console.log($1)"; }

[ -d node_modules/@google/genai ] || { echo "… installing dependencies"; npm install --no-audit --no-fund; }
npx tsc --noEmit >/dev/null 2>&1 && pass "typecheck" || fail "typecheck (run: npx tsc --noEmit)"

echo "… making sure context + capture exist"
trailer "$PR" --stage context >/dev/null && trailer "$PR" --stage capture >/dev/null || fail "context/capture failed (run bash docs/test-003.sh)"

# 1. Fallback: no API key → still a valid script that flags the mobile overflow (constitution Art. IV)
GEMINI_API_KEY= trailer "$PR" --stage narrate --force >/dev/null 2>&1
if [ -f "$OUT/script.json" ] && [ "$(field 's.source')" = "fallback" ]; then
  pass "no key → fallback script written (exit code 0)"
  [ "$(field "s.risks.some(r => r.captureId === 'pricing.mobile')")" = "true" ] && pass "fallback flags the mobile overflow" || fail "fallback missed the mobile overflow"
else
  fail "no key → fallback script not written"
fi

# 2. Live Gemini, 3 runs (prompt tuning, spec T5): source, model, speed, mobile risk
if grep -qE '^GEMINI_API_KEY=.+' .env 2>/dev/null || [ -n "${GEMINI_API_KEY:-}" ]; then
  hits=0
  for i in 1 2 3; do
    start=$(date +%s)
    trailer "$PR" --stage narrate --force > /tmp/narrate-$i.log 2>&1
    secs=$(( $(date +%s) - start ))
    src=$(field 's.source'); model=$(field 's.model || "-"')
    mobile=$(field "s.risks.some(r => r.captureId === 'pricing.mobile' && !/^Page is [0-9]+px wide/.test(r.description) && /overflow|wider|squeez|narrow|clip|cut|horizontal|scroll|column/i.test(r.description))")
    [ "$mobile" = "true" ] && hits=$((hits + 1))
    echo "  run $i: source=$src model=$model ${secs}s mobile-risk=$mobile"
    if [ "$src" != "gemini" ]; then grep "⚠" /tmp/narrate-$i.log | sed 's/^/    /'; fi
  done
  [ "$src" = "gemini" ] && pass "Gemini answered (last model: $model)" || fail "Gemini did not answer — see the ⚠ lines above"
  [ "$secs" -le 20 ] && pass "narrate under 20 s (${secs}s)" || warn "narrate took ${secs}s (target ≤ 20 s; try GEMINI_THINKING_LEVEL=MINIMAL)"
  [ "$hits" -ge 2 ] && pass "mobile overflow named by Gemini in $hits/3 runs" || warn "Gemini named the mobile overflow in only $hits/3 runs (the measured-overflow risk is still added automatically)"
  echo "  Final script:"; field "JSON.stringify({title:s.title, summary:s.summary, verdict:s.verdict, scenes:s.scenes.map(x=>x.caption), risks:s.risks.map(x=>x.severity+': '+x.description)}, null, 2)" | sed 's/^/    /'
else
  warn "GEMINI_API_KEY not set in .env — skipping live Gemini checks"
fi

trailer "$PR" --stage narrate | grep -q "(cached)" && pass "second run is cached" || fail "second run not cached"

[ "$FAILED" = 0 ] && echo "All feature 004 checks passed." || { echo "Some checks failed."; exit 1; }
