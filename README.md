# PR Trailers — Spec Kit

Spec-Driven Development kit for the AI Engineer Summit hackathon (6 h, solo).
Every PR gets an auto-generated 30-second video trailer showing what changed, posted as a PR comment.

**Read first:** [`constitution.md`](constitution.md).
**Flow per feature:** `spec.md` (what/why) → `plan.md` (how) → `tasks.md` (do). Approve a spec by changing its `**Status:**` to `Approved`.

## Prize targets
| Prize | How we earn it |
|---|---|
| Best Overall Hack | Live demo: open PR → trailer appears in the PR |
| Best Demo Video Using HyperFrames | Trailers **and** submission video rendered with HyperFrames (feature 007 dogfoods the product) |
| Best Use of Gemini API | Gemini vision reads before/after screenshots + diff and writes the narration |

## Pipeline
```
pr-trailer 42
  │
  ├─ 002 context   gh pr view/diff ─► affected routes            .trailer/42/context.json
  ├─ 003 capture   worktrees base/head ─► Playwright screenshots  .trailer/42/shots/*.png + changes.json
  ├─ 004 narrate   Gemini (vision) ─► scenes + captions + risks   .trailer/42/script.json
  ├─ 005 render    HyperFrames composition ─► MP4 + GIF preview   .trailer/42/trailer.mp4 / preview.gif
  └─ 006 publish   gh release upload + gh pr comment               PR comment with inline GIF + MP4 link
```

## Features and execution order (6-hour timeline)
| # | Feature | Budget | Clock | Depends |
|---|---|---|---|---|
| 001 | [demo-app](specs/001-demo-app/spec.md) — demo web app + the PR we'll trailer | 30 min | 0:00–0:30 | — |
| 002 | [pr-context-cli](specs/002-pr-context-cli/spec.md) — CLI skeleton, stage runner, PR → routes | 30 min | 0:30–1:00 | 001 |
| 003 | [before-after-capture](specs/003-before-after-capture/spec.md) — base/head screenshots + visual diff | 75 min | 1:00–2:15 | 002 |
| 004 | [gemini-narration](specs/004-gemini-narration/spec.md) — Gemini vision script + fallback | 45 min | 2:15–3:00 | 003 |
| 005 | [hyperframes-trailer](specs/005-hyperframes-trailer/spec.md) — HTML composition → MP4/GIF | 60 min | 3:00–4:00 | 004 |
| 006 | [pr-comment-publish](specs/006-pr-comment-publish/spec.md) — post trailer to the PR | 30 min | 4:00–4:30 | 005 |
| — | **Buffer / bug fixing** | 30 min | 4:30–5:00 | — |
| 007 | [submission-video](specs/007-submission-video/spec.md) — HyperFrames demo video + rehearsal + submit | 60 min | 5:00–6:00 | 006 |

**Hard stop for new code: 5:00.** If behind schedule, apply each feature's *Cut line*.

## Pre-flight (before the clock starts — setup only, no project code)
> Check the hackathon rules on what is allowed before the start. Setup and accounts are normally fine.
- [ ] Node LTS, `npm i -g tsx` (or use `npx tsx`).
- [ ] `ffmpeg -version` works; Google Chrome installed.
- [ ] HyperFrames smoke test: create a sample project and render one MP4. **Write down the exact CLI commands** (`npx hyperframes --help`) — features 005/007 depend on them.
- [ ] `npx playwright install chromium`.
- [ ] `gh auth status` OK; empty GitHub repo `pr-trailers` created.
- [ ] Gemini API key from Google AI Studio; pick the model id (fast vision-capable model) → `GEMINI_MODEL`.
- [ ] MLH: confirm the Gemini and HyperFrames prize submission requirements.

## Target repo layout
```
pr-trailers/
├─ apps/demo-app/            # 001 — Vite static site (the app the PRs change)
├─ src/
│  ├─ cli.ts                 # 002 — entry: pr-trailer <PR#> [--stage x] [--force]
│  ├─ stages/{context,capture,narrate,render,publish}.ts
│  └─ lib/{fs.ts,log.ts,schema.ts}
├─ templates/trailer/        # 005 — HyperFrames composition (HTML + data)
├─ video/submission/         # 007 — HyperFrames composition for the demo video
├─ trailer.config.json       # route map: source globs → routes
├─ .trailer/<pr#>/           # stage outputs (gitignored)
└─ .env / .env.example
```
