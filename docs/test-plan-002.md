# Test plan · 002 — CLI skeleton and PR context

Run `bash docs/test-002.sh [PR#]` from the repo root (default PR 1). Local only. Live checks need `gh` logged in and the demo PRs from 001.

| Acceptance criterion | Check | Expected |
|---|---|---|
| CLI runs, help and validation work | `npm run trailer -- --help`, `--stage nope` | Usage printed; unknown stage → exit 1 |
| Routes mapped from changed files | offline `mapRoutes` check | `pricing.ts` → `/pricing.html`; `styles.css` → all routes; unmapped → all routes |
| `context.json` written for PR #1 | `npm run trailer -- 1 --stage context --force` | `.trailer/1/context.json` with title, files, diff, routes |
| Second run is cached; `--force` re-runs | run twice, then with `--force` | `⏭ context (cached)`, then `✔ context` |
| Later stages are stubs | `npm run trailer -- 1` | Stops at `✖ capture: not implemented (feature 003)` with a re-run hint |
| Missing PR fails cleanly | `npm run trailer -- 999999 --stage context` | Error message + re-run hint, exit 1 |

Note: PR #1 changes `styles.css` (a global source), so its routes are **all** routes (`/`, `/pricing.html`).
