# Test plan · 003 — Before/after capture and visual diff

Run `bash docs/test-003.sh [PR#]` from the repo root (default PR 1). Local only. Needs `gh` login, the demo PR from 001 and Chromium (`npx playwright install chromium`).

| Acceptance criterion | Check | Expected |
|---|---|---|
| Base/head/diff PNGs for `/pricing.html` × desktop + mobile | `npm run trailer -- 1 --stage capture --force` | `.trailer/1/shots/pricing.{desktop,mobile}.{base,head,diff}.png` exist |
| Both pricing captures changed, with boxes | `changes.json` | `diffRatio > 0`, `unchanged: false`, 1–5 boxes each; sorted by `diffRatio` |
| `/` is captured but unchanged | `changes.json` | `home.*` → `unchanged: true` (PR #1 changes the shared stylesheet, so `/` is filmed too) |
| No leftover servers or worktrees | `git worktree list`, `lsof -i :4173 -i :4174`, `git for-each-ref refs/trailer` | 1 worktree, ports free, no temp refs |
| User's tree untouched | `git status`, current branch before/after | identical |
| Under 90 s | timer in the script | ~10 s with cached deps |
| Ctrl+C mid-run cleans up (manual) | start capture with `--force`, press Ctrl+C during the build | "interrupted" warning; re-run with `--force` works |
