# Plan · 003 — Before/after capture and visual diff

## Technical context
- Input: `.trailer/<pr>/context.json` (from 002) and `trailer.config.json`.
- New deps: `playwright`, `pixelmatch`, `pngjs`, `wait-on` (or a small fetch-poll helper).
- Output: `.trailer/<pr>/shots/{route-slug}.{viewport}.{base|head|diff}.png` and `.trailer/<pr>/changes.json`.

## Approach
1. **Worktrees** (Art. IX: never touch the user's tree):
   - `git fetch origin <base> && git worktree add .trailer/<pr>/wt-base origin/<base>`
   - `git fetch origin pull/<pr>/head:trailer-pr-<pr> && git worktree add .trailer/<pr>/wt-head trailer-pr-<pr>`
2. **Install and build** in each `wt-*/<app.dir>`: `npm install --prefer-offline --no-audit --no-fund`, then `app.build`. Run base and head **in parallel** (`Promise.all`).
3. **Serve**: spawn `app.preview` with `basePort`/`headPort` (detached process group) and poll `http://localhost:<port>/` until it returns 200 (timeout 30 s).
4. **Screenshot**: one Chromium instance; for each route × viewport → `page.setViewportSize`, `goto`, `waitForLoadState('networkidle')`, inject CSS to disable animations and transitions, then `screenshot({ fullPage: true })`.
5. **Diff**: `pngjs` decode; pad both images to max(width) × max(height) with white; `pixelmatch(threshold 0.1)` → diff PNG and changed count.
   - Boxes: divide the image into a 24 px grid, mark cells with >2% changed pixels, merge adjacent cells (flood fill) into rectangles, and keep the top 5 by area.
6. Write `changes.json`, sorted by `diffRatio` descending.
7. **Cleanup** in `finally`: kill process groups, `git worktree remove --force` for both, delete the temp branch.

## Contracts
`changes.json`:
```ts
{
  captures: {
    route: string; viewport: "desktop" | "mobile"; width: number; height: number;
    base: string; head: string; diff: string;        // relative paths
    diffRatio: number; unchanged: boolean;
    boxes: { x: number; y: number; w: number; h: number }[];
  }[]
}
```

## Constitution alignment
Art. III (output on disk; cached), Art. IX (worktrees, the user's tree is untouched), Art. VIII (web only).

## Risks
- `npm install` in worktrees is slow → `--prefer-offline`; pre-flight already warmed the npm cache. Fallback: symlink `node_modules` from the main checkout (the deps are identical in the demo).
- Port already in use from a crashed run → kill by port at stage start (`lsof -ti :4173 | xargs kill`).
- Full-page heights differ → handled by padding (FR-4).
- Fonts or antialiasing noise → threshold 0.1 and the 2% cell rule.

## Cut line
1st cut: drop the box computation (use one box = the whole diff bounding rectangle).
2nd cut: desktop viewport only.
