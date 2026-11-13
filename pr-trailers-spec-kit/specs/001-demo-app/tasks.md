# Tasks · 001 — Demo app and demo PR

> The change must be obvious on desktop; the regression must be obvious on mobile.

## T1 — Scaffold the Vite multi-page app
**Files:** `apps/demo-app/{index.html,pricing.html,styles.css,vite.config.ts,package.json}`
**Prompt:**
> Create a Vite vanilla-ts multi-page site in `apps/demo-app` for a fictional SaaS. `index.html`: hero section with a headline, subheadline, CTA button and 3 feature tiles. `pricing.html`: 3 pricing cards (Free, Pro, Team), each with a price, a 4-item feature list and a CTA. Shared `styles.css` with large readable type, generous spacing and a responsive layout that works at 390 px. Configure `vite.config.ts` `build.rollupOptions.input` for both pages. No frameworks, no external fonts or network calls.
**Acceptance:** `npm run build && npm run preview -- --port 4173` serves `/` and `/pricing.html`; they look clean at 1280 px and 390 px.

## T2 — Baseline on main [depends T1]
**Prompt:**
> Add `.gitignore` (node_modules, dist, .trailer, .env). Stop and ask the human to review and commit to `main` and push.
**Acceptance:** `main` on GitHub has the baseline app.

## T3 — Demo PR: pricing redesign [depends T2]
**Files:** `apps/demo-app/pricing.html`, `apps/demo-app/styles.css`, `apps/demo-app/src/pricing.ts`
**Prompt:**
> On branch `feat/pricing-redesign`: add a "Most popular" badge on the Pro card, change the CTA color to a bold accent, and add a monthly/annual toggle that swaps the prices (annual = 20% off). Also add ONE subtle regression visible only at mobile width: make the Pro card's feature list `white-space: nowrap` so its text overflows the card at 390 px. Don't add a comment pointing out the regression.
**Acceptance:** desktop looks improved; at 390 px the Pro card text overflows. The human commits and pushes, then runs `gh pr create --title "Pricing page redesign" --body "New badge, accent CTA, annual toggle."`.

## T4 — Backup PR [P] [depends T2]
**Prompt:**
> On branch `feat/hero-copy` from `main`: change the hero headline and subheadline copy and the accent color on `/`.
**Acceptance:** PR #2 is open.

## T5 — Tests
- `npm run build` passes on both branches.
- Manual: DevTools at 390 px on `feat/pricing-redesign` → overflow visible; on `main` → no overflow.
- `gh pr list` shows PR #1 (and #2).
