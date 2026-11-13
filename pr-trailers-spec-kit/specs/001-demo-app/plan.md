# Plan · 001 — Demo app and demo PR

## Technical context
- New repo `pr-trailers`, app in `apps/demo-app/` (same repo as the tool, so one `gh` context).
- Vite multi-page: `apps/demo-app/index.html`, `apps/demo-app/pricing.html`, `apps/demo-app/styles.css`, `apps/demo-app/vite.config.ts` (`build.rollupOptions.input` with both pages).

## Approach
1. Scaffold: `npm create vite@latest apps/demo-app -- --template vanilla-ts`, then strip the boilerplate.
2. Build a simple landing page (`/`) and a pricing page with 3 cards (`/pricing.html`). Clean styling, large type (projector-friendly).
3. Commit to `main` (the human commits — Art. IX).
4. Branch `feat/pricing-redesign`: badge, CTA color, monthly/annual toggle (a few lines of JS), plus the mobile regression (for example a `white-space: nowrap` on the feature list, or a fixed `min-width` on cards).
5. Push the branch and open PR #1 with `gh pr create`.
6. Branch `feat/hero-copy` from `main`: new headline and accent color on `/`. Open PR #2 as the backup.

## Contracts
- Scripts: `npm run build`, `npm run preview -- --port <p>` (used by 003).
- Routes listed in `trailer.config.json` (created in 002): `["/", "/pricing.html"]`.

## Constitution alignment
Art. I (visible change), Art. VIII (static web only), Art. IX (the human commits and pushes).

## Risks
- Spending too long on styling → cap it at 20 min, using a minimal CSS reset and system fonts.
- The regression isn't visible enough → confirm at 390 px in DevTools before opening the PR.

## Cut line
Skip PR #2 (the backup PR).
