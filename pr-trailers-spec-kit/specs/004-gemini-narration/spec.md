# Spec · 004 — Gemini narration (vision)

**Estado:** Borrador · **Origin:** hackathon plan · **Priority:** High · **Depends:** 003
**Budget:** 45 min (2:15–3:00)

## Why
Screenshots show *that* something changed; the trailer needs to say *what* changed and *what to watch out for*. Gemini looks at the before/after images, the diff boxes and the code diff, and writes a short script: scene captions plus any risks (for example "the Pro card text overflows on mobile"). This is our entry for **Best Use of Gemini API**.

## User stories
- **US-1.** As a reviewer, I want each scene to have a one-line caption in plain English, so I understand the change while watching.
- **US-2.** As a reviewer, I want the trailer to flag things that look broken, so visual regressions don't get merged.
- **US-3.** As the presenter, I want the pipeline to finish even if Gemini fails, so the live demo can't break here.

## Functional requirements (EARS)
- **FR-1.** WHEN narrate runs, THE SYSTEM SHALL send Gemini the PR title/body, the truncated diff, and the before/after images of up to 4 most-changed captures, with their boxes.
- **FR-2.** THE SYSTEM SHALL request structured JSON output: a trailer title, a one-line summary, one scene per capture (caption ≤ 12 words, detail ≤ 25 words, focus box), a list of risks (with capture reference and severity), and an overall verdict.
- **FR-3.** THE SYSTEM SHALL validate the response against a schema and clamp text lengths.
- **FR-4.** IF the Gemini call fails, times out (>30 s) or returns invalid output, THE SYSTEM SHALL write a deterministic fallback script (from the PR title and the capture list) and mark it `source: "fallback"`.
- **FR-5.** THE SYSTEM SHALL NOT send unchanged captures to Gemini.
- **FR-6.** The prompt SHALL instruct Gemini to only report risks visible in the images, and not to invent features.

## Acceptance criteria
- [ ] For PR #1, `script.json` has `source: "gemini"`, at least 2 scenes, and a risk that mentions the mobile overflow.
- [ ] With `GEMINI_API_KEY` unset, the stage still writes a valid `script.json` with `source: "fallback"`.
- [ ] The stage completes in under 20 s on PR #1.

## Out of scope
Voice-over audio (stretch goal), multi-language output.

## Clarifications (resolved)
- ✅ Gemini (vision) over Claude, to compete for the Gemini prize (critical round).
- ✅ Structured JSON output; the render stage never parses free text.
- [NEEDS CLARIFICATION] Exact model id (`GEMINI_MODEL`), chosen in pre-flight: a fast vision-capable Gemini model.
- [NEEDS CLARIFICATION] Voice-over with Gemini TTS: stretch goal, only if time remains after 006.
