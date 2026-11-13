# Spec · 003 — Before/after capture and visual diff

**Estado:** Borrador · **Origin:** hackathon plan · **Priority:** High · **Depends:** 002
**Budget:** 75 min (1:00–2:15) — the riskiest feature; start it early.

## Why
The trailer's raw material is **evidence**: what each affected screen looked like before the PR and after it, at desktop and mobile widths, plus where exactly the pixels changed. This is what lets the trailer (and Gemini) point at the change instead of guessing.

## User stories
- **US-1.** As a reviewer, I want before/after screenshots of every affected screen, so I can see the change without checking out the branch.
- **US-2.** As a reviewer, I want mobile and desktop captures, so I catch layout breaks that only appear on small screens.
- **US-3.** As the narration stage, I want the changed regions as boxes, so I can highlight them and focus my analysis.

## Functional requirements (EARS)
- **FR-1.** WHEN capture runs, THE SYSTEM SHALL build and serve the base branch and the PR head branch side by side, isolated from the user's working copy.
- **FR-2.** For each affected route × each configured viewport, THE SYSTEM SHALL take a full-page screenshot of base and of head.
- **FR-3.** For each pair, THE SYSTEM SHALL compute a pixel diff: a diff image, the changed-pixel ratio, and bounding boxes of the changed regions.
- **FR-4.** IF base and head screenshots differ in height, THE SYSTEM SHALL pad the shorter one, so they can be compared.
- **FR-5.** THE SYSTEM SHALL order the captures by changed ratio (most changed first) and mark pairs with no change (ratio < 0.1%) as `unchanged`.
- **FR-6.** WHEN capture finishes or fails, THE SYSTEM SHALL stop the preview servers and remove temporary worktrees.
- **FR-7.** THE SYSTEM SHALL NOT modify the user's current branch or working tree.

## Acceptance criteria
- [ ] For PR #1: `.trailer/1/shots/` contains base/head/diff PNGs for `/pricing.html` × desktop and mobile.
- [ ] `changes.json` lists both pairs with `diffRatio > 0` and at least one box each.
- [ ] After the run, no preview server process is left running and `git worktree list` shows only the main tree.
- [ ] The stage finishes in under 90 s on the demo app (cached deps).

## Out of scope
Video screen recording of interactions (stretch goal), authenticated pages, non-Vite apps.

## Clarifications (resolved)
- ✅ Static full-page screenshots, not recordings: deterministic and fast. Motion comes from the HyperFrames animation instead.
- ✅ Pixel diff (pixelmatch), not visual AI, decides *where* things changed. Gemini explains *what* changed.
- [NEEDS CLARIFICATION] Whether to also capture an interaction state (for example after clicking the "Annual" toggle). Proposed: an optional `actions` field per route in the config, as a stretch goal.
