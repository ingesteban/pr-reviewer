#!/usr/bin/env bash
# Feature 005 checks (local only). Run from anywhere: bash docs/test-005.sh [PR#]   (default PR 1)
# Needs: features 001-004 working (script.json), FFmpeg, and Chrome (npx hyperframes doctor).
set -uo pipefail
cd "$(dirname "$0")/.."
PR="${1:-1}"
OUT=".trailer/$PR"
FAILED=0
pass() { echo "✔ $1"; }
fail() { echo "✖ $1"; FAILED=1; }
warn() { echo "⚠ $1"; }
trailer() { npm run -s trailer -- "$@"; }

[ -x node_modules/.bin/hyperframes ] || { echo "… installing dependencies"; npm install --no-audit --no-fund; }
npx tsc --noEmit >/dev/null 2>&1 && pass "typecheck" || fail "typecheck (run: npx tsc --noEmit)"

echo "… making sure context, capture and narrate exist"
trailer "$PR" --stage context >/dev/null && trailer "$PR" --stage capture >/dev/null && trailer "$PR" --stage narrate >/dev/null \
  || fail "earlier stages failed (run bash docs/test-004.sh)"

echo "… rendering the trailer with HyperFrames (~30-60 s)"
start=$(date +%s)
if trailer "$PR" --stage render --force; then
  secs=$(( $(date +%s) - start ))
  [ "$secs" -le 120 ] && pass "render finished in ${secs}s (≤ 120 s)" || warn "render took ${secs}s (target ≤ 120 s; try TRAILER_QUALITY=draft)"
else
  fail "render stage failed"
fi

if [ -f "$OUT/trailer.mp4" ]; then
  size=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT/trailer.mp4")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/trailer.mp4")
  [ "$size" = "1280x720" ] && pass "trailer.mp4 is 1280×720" || fail "trailer.mp4 is $size (expected 1280x720)"
  node -e "process.exit($dur >= 20 && $dur <= 40 ? 0 : 1)" && pass "duration ${dur%.*}s (20–40 s)" || fail "duration $dur s outside 20–40 s"
else
  fail "no $OUT/trailer.mp4"
fi
if [ -f "$OUT/preview.gif" ]; then
  gif=$(wc -c < "$OUT/preview.gif" | tr -d ' ')
  [ "$gif" -le 5242880 ] && pass "preview.gif $((gif / 1024)) KB (≤ 5 MB)" || fail "preview.gif too big ($((gif / 1024)) KB)"
else
  fail "no $OUT/preview.gif"
fi
[ -f "$OUT/poster.png" ] && pass "poster.png present" || fail "no $OUT/poster.png"

# HyperFrames' own contract checker on the generated composition (warnings are fine)
if (cd "$OUT/video" && ../../../node_modules/.bin/hyperframes check --json 2>/dev/null) | node -e "
  let s=''; process.stdin.on('data', d => s += d).on('end', () => {
    const j = JSON.parse(s.slice(s.indexOf('{')));
    console.log('  lint: ' + j.lint.errorCount + ' errors, ' + j.lint.warningCount + ' warnings');
    process.exit(j.lint.errorCount === 0 ? 0 : 1);
  });"; then pass "hyperframes check: no errors"; else fail "hyperframes check reported errors (cd $OUT/video && npx hyperframes check)"; fi

trailer "$PR" --stage render | grep -q "(cached)" && pass "second run is cached" || fail "second run not cached"

[ "$FAILED" = 0 ] && echo "All feature 005 checks passed. Watch it: open $OUT/trailer.mp4" || { echo "Some checks failed."; exit 1; }
