# PR Trailers — Constitution

> The source of truth for every feature in `specs/NNN-*/`. Load it **once per feature**, before the spec and plan (the `make-feature` flow).
> Context: AI Engineer Summit hackathon · **6 hours · solo build**.
> Pitch: *"Diffs show you the code. PR Trailers show you the change."*
> Prize targets: Best Overall Hack · Best Demo Video Using HyperFrames · Best Use of Gemini API.

---

## Part A — Principles

### Art. I — The demo is the product
We are judged on a 3-minute live demo and a demo video. Every decision favors what is **visible and reliable on stage** over completeness, elegance or coverage. If something doesn't show up in the demo or the video, it's out of scope.

### Art. II — The time box is law
- Every feature has a budget (`README.md` → timeline). If a feature runs **15 min over budget**, apply its **Cut line** (in `plan.md`) instead of extending.
- **5:00 is the code freeze.** After that, only feature 007 (video, rehearsal, submission).
- A task blocked for more than 15 min → apply the cut line, note it, and move on. Don't debug in circles.

### Art. III — A pipeline of re-runnable stages
`context → capture → narrate → render → publish`. Each stage:
- reads its inputs **only from disk** and writes its outputs to `.trailer/<pr>/` (nothing is passed only in memory between stages);
- can run alone: `npm run trailer -- <pr> --stage <name>`;
- is skipped when its output file exists, unless `--force`.
This is our live-demo insurance: if something fails on stage, re-run one stage or use the cached output.

### Art. IV — Every LLM step has a deterministic fallback
Gemini output is validated with zod at the stage boundary. On error, a timeout (>30 s) or invalid JSON → template-based fallback, with `source: "fallback"`. **The pipeline always produces a trailer.**

### Art. V — HyperFrames is the only renderer
All video (per-PR trailers **and** the submission video) is rendered with HyperFrames from HTML compositions. No manual video editing, no other renderer. Animations must be deterministic/seekable, as HyperFrames requires.

### Art. VI — Scope boundary
Web apps only, one demo repo (public), Vite/static pages. No auth flows, backends, databases, servers, GitHub Apps or CI.

---

## Part B — Technical rules

### Art. VII — Stack (closed list)
| Concern | Choice |
|---|---|
| Runtime | Node ≥ 22.18 running TypeScript natively (`node src/cli.ts`, type stripping; no tsx, no build step), `strict: true`, ESM, `.ts` import extensions, erasable syntax only |
| CLI args | `node:util` `parseArgs` |
| Validation | `zod` at every stage boundary (inputs and outputs) |
| Capture | `playwright` (Chromium), `pixelmatch`, `pngjs` |
| Images | `sharp` |
| LLM | `@google/genai` (Gemini), model id from `GEMINI_MODEL` |
| Video | HyperFrames CLI + `ffmpeg` |
| GitHub | `gh` CLI (no Octokit, no tokens in code) |
| Misc | `dotenv`, `picomatch`, `picocolors` |
Adding a dependency outside this list is allowed **only if it saves time**, and it must be listed in the feature's final summary.

### Art. VIII — Module boundaries
```
src/cli.ts            → may import stages/ and lib/
src/stages/<name>.ts  → may import lib/ and its own folder src/stages/<name>/*
src/lib/*             → imports nothing from stages/ or cli
templates/, video/    → pure HTML/CSS/JS compositions; never import from src/
```
- **Stages never import each other.** They communicate only through files in `.trailer/<pr>/`.
- Shared schemas live in `src/lib/schema.ts`.
- External commands (`git`, `gh`, `ffmpeg`, HyperFrames, `npm`) are called through one helper in `src/lib/exec.ts`, which logs the command and throws on a non-zero exit with stderr included.

### Art. IX — Stage artifact contracts
| Stage | Writes (cache key in **bold**) |
|---|---|
| context | **`context.json`** |
| capture | `shots/*.png`, **`changes.json`** |
| narrate | **`script.json`** |
| render | `video/`, **`trailer.mp4`**, `preview.gif`, `poster.png` |
| publish | **`published.json`** |
Shapes are defined in each feature's `plan.md` and enforced by zod. Changing a contract means updating every consumer **in the same feature**.

### Art. X — Secrets and config
- Secrets only in `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`); `.env` is gitignored; `.env.example` is committed with empty values.
- Never log keys, and never write them to `.trailer/` artifacts.
- `gh` uses its own login. No GitHub tokens in code or `.env`.
- Project config lives only in `trailer.config.json`.

### Art. XI — Isolation and git hygiene
- **Never modify the user's working tree or current branch.** Base/head checkouts use `git worktree` inside `.trailer/<pr>/`, and are removed in `finally`.
- **Agents never run `git commit` or `git push`.** When a task needs a commit (e.g. 001's baseline and demo PR branches), stop at that point, list the files, and ask the human to commit and push.
- Exception: the publish stage writes to GitHub by design, but **only** to the `trailers` release and to PR comments. Never to branches.
- Always clean up child processes (preview servers) and free ports, even on failure or Ctrl+C.

### Art. XII — Protected files
Don't edit these without stating it explicitly in the final summary, so the human reviews them:
- `trailer.config.json` (the demo depends on its routes and ports)
- `templates/trailer/*` once feature 005 is done (the trailer's look is locked for the video)
- `apps/demo-app/*` on `main` and on the demo PR branches (the planted mobile regression must survive)
- `.env.example`, `.gitignore`

### Art. XIII — Code conventions
- Small, plain functions; no classes unless needed. One stage = one `run(pr, cfg)` export.
- Async/await everywhere; set explicit timeouts on every network or external call.
- Console output is part of the live demo: use stage banners `▶ name` / `✔ name 3.2s` / `⏭ name (cached)` / `⚠ warning` / `✖ name: error` followed by a re-run hint. No stack-trace dumps unless `DEBUG=1`.
- Comments only where the *why* isn't obvious. No TODOs left in demo-critical paths.

---

## Part C — Execution rules (make-feature)

### Art. XIV — Approval gate
A feature runs only when its `spec.md` has `**Estado:** Aprobada`. Changing that line is the human's approval.

### Art. XV — Autoexecution
Run tasks T1…Tn in order without asking for approval between them. Stop **only** if a failed task blocks the tasks that depend on it. Tasks marked `[P]` may run in any order once their dependencies are met.

### Art. XVI — Test deliverables (hackathon version)
For the last task (Tn), produce only:
1. `docs/test-<feature>.sh`: executable, **local only** (no dev/prod environments exist), runs the feature's checks in under 2 min, and exits non-zero on failure.
2. `docs/test-plan-<feature>.md`: at most 15 lines, mapping acceptance criteria → command → expected result.
No separate dev/prod plans.

### Art. XVII — Definition of done (per feature)
- The acceptance criteria in `spec.md` pass, or they fail with a documented cut-line reason.
- `docs/test-<feature>.sh` passes.
- `npm run trailer -- 1` still runs end to end up to the furthest implemented stage (later stages may be stubs).
- Final summary delivered: tasks ✅/⚠️/❌, cut lines applied, protected files touched, dependencies added, decisions taken, and a reminder that **nothing was committed**.
