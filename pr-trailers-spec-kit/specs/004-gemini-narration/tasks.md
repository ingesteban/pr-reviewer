# Tasks · 004 — Gemini narration (vision)

> The pipeline must always produce a script. Gemini makes it smart; the fallback makes it safe.

## T1 — Script schema + fallback
**Files:** `src/lib/schema.ts`, `src/stages/narrate/fallback.ts`
**Prompt:**
> Add the zod `ScriptSchema` from plan.md with length clamps (truncate rather than reject). Implement `fallbackScript(context, changes)`: title = PR title (≤ 8 words), summary = "Visual changes on N screens", one scene per changed capture with caption "Updated <route> (<viewport>)", empty risks, verdict "looks-good", source "fallback".
**Acceptance:** unit check: fallback output passes ScriptSchema.

## T2 — Image preparation [P]
**Files:** `src/stages/narrate/images.ts`
**Prompt:**
> With sharp, for a capture produce base64 PNGs of base and head downscaled to width 800, cropped vertically to max 2400 px centered on the union of the boxes; return the scaled box coordinates too.
**Acceptance:** the output images are ≤ 800 px wide; the boxes still align (check by drawing one).

## T3 — Gemini call [depends T1, T2]
**Files:** `src/stages/narrate/gemini.ts`
**Prompt:**
> Using @google/genai, build a multimodal request (system/text instructions per plan.md + labeled BEFORE/AFTER images per capture) and call generateContent with `GEMINI_MODEL`, `responseMimeType: "application/json"` and a responseSchema mirroring ScriptSchema. 30 s timeout. Parse, validate and clamp; return a script with `source: "gemini"`. Throw on any problem (the caller falls back). Verify the SDK call shape against the package README.
**Acceptance:** a real call on PR #1 returns a valid script.

## T4 — Stage wiring [depends T3]
**Files:** `src/stages/narrate.ts`
**Prompt:**
> Narrate stage: select ≤ 4 changed captures; try Gemini; on any error log a yellow warning (`⚠ Gemini failed: <reason> → using fallback`) and use fallbackScript; write `script.json`.

## T5 — Prompt tuning
- Run `npm run trailer -- 1 --stage narrate --force` 3 times. The mobile overflow must appear in `risks` in at least 2 out of 3 runs; otherwise strengthen the overflow instruction in the prompt.

## T6 — Tests
- With a valid key → `source: "gemini"`, risk mentions overflow/clipping on mobile.
- `GEMINI_API_KEY= npm run trailer -- 1 --stage narrate --force` → `source: "fallback"`, exit code 0.
- `npx tsx scripts/check-script.ts .trailer/1/script.json` (a 5-line script that parses the file with ScriptSchema) → valid.
