# Plan · 004 — Gemini narration (vision)

## Technical context
- Inputs: `context.json` (002), `changes.json` + PNGs (003).
- New deps: `@google/genai` (official Gemini JS SDK), `sharp` (downscaling images).
- Output: `.trailer/<pr>/script.json`.

## Approach
1. Select up to 4 captures where `unchanged === false`, sorted by `diffRatio`.
2. For each: downscale base and head with `sharp` to width 800 and crop height to at most 2400 px, keeping the region around the boxes (scale the box coordinates the same way).
3. Build a multimodal request: a text block (role, PR metadata, diff, box coordinates per image, rules), then for each capture the labeled `BEFORE <id>` and `AFTER <id>` images as `inlineData` (base64 PNG).
4. Call `ai.models.generateContent({ model: GEMINI_MODEL, contents, config: { responseMimeType: "application/json", responseSchema } })` with a 30 s `AbortController` timeout. *(Verify the SDK call shape against the @google/genai README during the build.)*
5. Parse, validate with zod, clamp text lengths, and attach `source: "gemini"`.
6. On any failure → `fallbackScript(context, changes)` with `source: "fallback"`.

## Contracts
`script.json`:
```ts
{
  source: "gemini" | "fallback";
  title: string;            // ≤ 8 words, e.g. "Pricing page gets a glow-up"
  summary: string;          // ≤ 20 words
  verdict: "looks-good" | "needs-a-look";
  scenes: { captureId: string; caption: string; detail: string; focusBox: number }[];
  risks: { captureId: string; description: string; severity: "low" | "medium" | "high" }[];
}
```
`captureId` = `<route-slug>.<viewport>` (it matches the PNG names from 003).

Prompt rules (excerpt):
- "You are a senior product reviewer making a 30-second video trailer of a pull request."
- "Describe only what is visible in the AFTER images compared with the BEFORE images. Never invent functionality."
- "Flag layout problems (overflow, overlap, clipped text, broken alignment) as risks with severity."
- "Captions: plain English, present tense, no code identifiers."

## Constitution alignment
Art. IV (schema + fallback + timeout), Art. VII (key in `.env`), Art. III (cached output).

## Risks
- Images too big → downscale and cap at 4 captures (8 images).
- Gemini misses the regression → the prompt explicitly asks about overflow/clipping on mobile; test the prompt 2–3 times and tune it.
- Wrong SDK signature → 5 min check against the README; fallback keeps the pipeline alive anyway.

## Cut line
Send only head and diff images (no base), and skip the box crop.
