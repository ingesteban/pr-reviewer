# Spec · 005 — HyperFrames trailer render

**Estado:** Borrador · **Origin:** hackathon plan · **Priority:** High · **Depends:** 004
**Budget:** 60 min (3:00–4:00)

## Why
This is the product's signature output: a polished 30-second video built from the script and screenshots. It must look good on a projector and in a GitHub comment, and it must be rendered with HyperFrames (Art. V) for the **Best Demo Video Using HyperFrames** prize.

## User stories
- **US-1.** As a reviewer, I want a short video that walks me through the change, so I understand it in 30 seconds.
- **US-2.** As a reviewer, I want before/after shown side by side with the changed areas highlighted, so my eye goes straight to the change.
- **US-3.** As a reviewer, I want risks shown on their own card, so I don't miss them.

## Functional requirements (EARS)
- **FR-1.** WHEN render runs, THE SYSTEM SHALL fill an HTML composition template with `script.json`, `context.json` and the capture images, and render it to MP4 with HyperFrames.
- **FR-2.** The trailer SHALL contain, in order: a title card (PR number, title, author), a summary card, one before/after scene per script scene, a risks card (only if risks exist), and an outro card with the verdict and "Made with PR Trailers".
- **FR-3.** Each before/after scene SHALL show both images, animate the highlight boxes in, and show the caption as a lower third.
- **FR-4.** THE SYSTEM SHALL keep the total length between 20 and 40 seconds, adjusting scene durations to the number of scenes.
- **FR-5.** THE SYSTEM SHALL also produce an animated GIF preview (≤ 10 s, ≤ 5 MB) and a poster PNG, for inline display on GitHub.
- **FR-6.** The trailer SHALL be legible at 1280×720 (minimum font size 28 px).

## Acceptance criteria
- [ ] `.trailer/1/trailer.mp4` exists, 1280×720, 20–40 s, and plays in QuickTime/Chrome.
- [ ] The risks card shows the mobile overflow from PR #1.
- [ ] `preview.gif` is ≤ 5 MB and `poster.png` exists.
- [ ] Rendering takes under 2 minutes.

## Out of scope
Audio and voice-over, music (stretch goal), multiple templates or themes.

## Clarifications (resolved)
- ✅ One template, data-driven. The template is the place to spend design time; the data comes from earlier stages.
- ✅ GIF preview because GitHub comments render GIFs inline, while an MP4 posted through the API only appears as a link (see 006).
- [NEEDS CLARIFICATION] Exact HyperFrames CLI commands and composition attributes. Confirm them in pre-flight (`npx hyperframes --help`, repo README) and use the HyperFrames agent skill in Claude Code to write the composition.
