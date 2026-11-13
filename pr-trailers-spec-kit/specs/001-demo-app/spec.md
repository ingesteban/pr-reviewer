# Spec · 001 — Demo app and demo PR

**Estado:** Aprobada · **Origin:** hackathon plan · **Priority:** High · **Depends:** —
**Budget:** 30 min (0:00–0:30)

## Why
PR Trailers needs a web app to film and a PR whose change is **visible** and tells a story. The demo PR also needs one subtle visual regression, so the trailer can show its value: "the diff looked fine, but the trailer caught the mobile layout break."

## User stories
- **US-1.** As the presenter, I want a small, good-looking web app, so the trailer looks professional on the projector.
- **US-2.** As the presenter, I want a ready-made PR with a clear UI change and a hidden mobile regression, so the live demo always has something meaningful to show.

## Functional requirements (EARS)
- **FR-1.** The demo app SHALL serve at least 2 routes (`/` and `/pricing.html`) from a single `npm run dev`/`npm run preview` command on a configurable port.
- **FR-2.** The demo PR SHALL change the pricing page visibly: a "Most popular" badge, a new CTA color, and a monthly/annual price toggle.
- **FR-3.** The demo PR SHALL include one intentional regression that is visible only at mobile width (for example, the pricing card text overflowing its container at 390 px).
- **FR-4.** The `main` branch SHALL keep the original page, so base and head render differently.
- **FR-5.** The app SHALL NOT need a backend, auth or network calls to render.

## Acceptance criteria
- [ ] `npm run build && npm run preview -- --port 4173` serves both routes on `main`.
- [ ] Branch `feat/pricing-redesign` exists, with PR #1 open on GitHub against `main`.
- [ ] At 1280 px the PR looks better; at 390 px a card visibly overflows.
- [ ] A second backup PR (`feat/hero-copy`, text and color change on `/`) exists for a second live run.

## Out of scope
Any real product features, routing libraries, frameworks beyond Vite.

## Clarifications (resolved)
- ✅ Vite multi-page with vanilla HTML/CSS: fastest to build, no framework.
- ✅ The regression is deliberate and visible on mobile only. It's the demo's "aha" moment.
- [NEEDS CLARIFICATION] Brand/theme of the fake product (for example "Nimbus — cloud notes"). Any name works.
