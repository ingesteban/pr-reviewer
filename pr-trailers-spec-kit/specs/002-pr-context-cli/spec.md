# Spec · 002 — CLI skeleton and PR context

**Estado:** Aprobada · **Origin:** hackathon plan · **Priority:** High · **Depends:** 001
**Budget:** 30 min (0:30–1:00)

## Why
Everything runs from one command on stage: `pr-trailer <PR#>`. This feature builds that command, the re-runnable stage runner (Art. III), and the first stage: working out which PR it is, what changed and which screens to film.

## User stories
- **US-1.** As the presenter, I want to run `pr-trailer 1` and watch every stage report progress, so the live demo is easy to follow.
- **US-2.** As the developer, I want to re-run a single stage, so I can recover quickly when something fails.
- **US-3.** As the pipeline, I want the list of routes the PR affects, so capture only films relevant screens.

## Functional requirements (EARS)
- **FR-1.** WHEN the user runs `pr-trailer <PR#>`, THE SYSTEM SHALL run the stages `context → capture → narrate → render → publish` in order and print each stage's status and duration.
- **FR-2.** WHEN `--stage <name>` is given, THE SYSTEM SHALL run only that stage.
- **FR-3.** IF a stage's output file already exists and `--force` is not given, THE SYSTEM SHALL skip that stage and say so.
- **FR-4.** The context stage SHALL fetch the PR's number, title, body, author, base/head branch, URL, changed files, and the diff (truncated to a size limit).
- **FR-5.** The context stage SHALL map changed files to routes using `trailer.config.json`. A file listed as a global source (for example a shared stylesheet) affects all routes.
- **FR-6.** IF no changed file maps to a route, THE SYSTEM SHALL fall back to all configured routes.
- **FR-7.** IF a stage throws an error, THE SYSTEM SHALL stop, print the error, and tell the user which `--stage` command to re-run.

## Acceptance criteria
- [ ] `npx tsx src/cli.ts 1` writes `.trailer/1/context.json` with `routes: ["/pricing.html"]` (or all routes, if `styles.css` changed).
- [ ] Running it a second time skips `context`; `--force` re-runs it.
- [ ] The later stages exist as stubs that log "not implemented" without crashing.

## Out of scope
Capture, narration, render, publish (features 003–006).

## Clarifications (resolved)
- ✅ Local CLI trigger, no GitHub Action (decided in the critical round).
- ✅ The route map is a static config file, not LLM-inferred: deterministic and fast.
- ✅ Diff truncation limit 12,000 chars.
