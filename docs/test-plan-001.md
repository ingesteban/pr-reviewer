# Test plan · 001 — Demo app and demo PR

Run `bash docs/test-001.sh` (on `main`, then again on `feat/pricing-redesign`). Local only.

| Acceptance criterion | Check | Expected |
|---|---|---|
| Both routes build and serve on `main` | build + `curl` `/` and `/pricing.html` on port 4173 | ✔ build, both 200 |
| PR branch exists and PR #1 is open | `git ls-remote origin feat/pricing-redesign`, `gh pr list` | ✔ pushed, PR open |
| PR looks better at 1280 px | Manual: open `/pricing.html` on the PR branch | Badge, gradient CTA, Monthly/Annual toggle |
| A card visibly overflows at 390 px | Script (once Playwright is installed in 003) or DevTools at 390 px | Page wider than 390 px, cards squeezed into 3 columns |
| Backup PR exists | `gh pr list` | PR for `feat/hero-copy` open (optional) |
| No mobile breakage on `main` | DevTools at 390 px on `main` | Cards stack in one column |
