# Tasks · 003 — Before/after capture and visual diff

> Never touch the user's working tree. Always clean up servers and worktrees, even on failure.

## T1 — Worktrees + build + serve
**Files:** `src/stages/capture/serve.ts`
**Prompt:**
> Implement `prepareSide(pr, side: "base"|"head", cfg)` → creates the git worktree as in plan.md step 1, runs install + build in `<worktree>/<cfg.app.dir>`, spawns the preview command (replace `{port}`) as a detached process group, and polls until HTTP 200 (30 s timeout). Return `{ url, stop() }` where `stop` kills the process group and removes the worktree. Before spawning, free the port if it is taken. Build base and head in parallel.
**Acceptance:** both URLs respond; after `stop()`, `git worktree list` is clean.

## T2 — Screenshots [depends T1]
**Files:** `src/stages/capture/shoot.ts`
**Prompt:**
> With Playwright Chromium, for each route × viewport from config, open base and head URLs, disable animations via injected CSS (`*{animation:none!important;transition:none!important;caret-color:transparent!important}`), wait for networkidle, and take full-page screenshots to `.trailer/<pr>/shots/<slug>.<viewport>.<side>.png`. Reuse one browser instance.
**Acceptance:** 4 PNGs for PR #1 (1 route × 2 viewports × 2 sides).

## T3 — Pixel diff + boxes [P] [depends T2]
**Files:** `src/stages/capture/diff.ts`
**Prompt:**
> Implement `diffPair(basePath, headPath, outPath)` using pngjs + pixelmatch (threshold 0.1). Pad both images to max width/height with white first. Compute diffRatio = changed / total pixels. Compute boxes: 24 px grid, cells with >2% changed pixels, merge 4-connected cells into bounding rectangles, keep the top 5 by area. Write the diff PNG. Return `{ diffRatio, boxes, width, height }`.
**Acceptance:** for the pricing pair, boxes cover the badge/CTA area on desktop and the overflowing card on mobile.

## T4 — Stage wiring [depends T1–T3]
**Files:** `src/stages/capture.ts`
**Prompt:**
> Wire T1–T3 into the capture stage: read context.json, prepare both sides, shoot, diff, write `changes.json` (sorted by diffRatio desc; `unchanged = diffRatio < 0.001`), and always call stop() for both sides in `finally`. Validate the output with a zod schema.
**Acceptance:** `npm run trailer -- 1 --stage capture` produces the full output in under 90 s.

## T5 — Tests
- `npm run trailer -- 1 --stage capture --force` → `changes.json` with 2 captures, both `unchanged: false`.
- Open the mobile diff PNG → the overflow region is highlighted.
- `git worktree list` → only the main tree; `lsof -i :4173 -i :4174` → empty.
- Kill the run mid-way (Ctrl+C), then re-run with `--force` → it still works (port cleanup).
