# Test plan · 004 — Gemini narration

Run `bash docs/test-004.sh [PR#]` from the repo root (default PR 1). Local only. Live checks need `GEMINI_API_KEY` in `.env`.

| Acceptance criterion | Check | Expected |
|---|---|---|
| Works without Gemini | `GEMINI_API_KEY= npm run trailer -- 1 --stage narrate --force` | `script.json` with `source: "fallback"`, exit 0, mobile overflow risk present |
| Gemini writes the script | `npm run trailer -- 1 --stage narrate --force` | `source: "gemini"`, `model: "gemini-4-hydrogen"` (or `gemini-3.8-flash` if Hydrogen is unavailable) |
| Mobile regression flagged | `risks` in `script.json` | a `pricing.mobile` risk about overflow / squeezed columns (Gemini, plus the measured-overflow check as a safety net) |
| Under 20 s | timer in the script | ≤ 20 s; if slower, set `GEMINI_THINKING_LEVEL=MINIMAL` in `.env` |
| Prompt quality (T5) | 3 live runs | mobile overflow named by Gemini in ≥ 2 of 3 runs |
| Cached re-run | run without `--force` | `⏭ narrate (cached)` |

Model chain: `GEMINI_MODEL` (default `gemini-4-hydrogen`) → `GEMINI_FALLBACK_MODEL` (default `gemini-3.8-flash`) → template fallback.
