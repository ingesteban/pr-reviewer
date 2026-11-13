# Plan · 005 — HyperFrames trailer render

## Technical context
- HyperFrames: open-source HTML → MP4 renderer from HeyGen (Chrome + FFmpeg under the hood). Videos are HTML compositions with timing data attributes and seekable animations. It ships agent skills for Claude Code, so let Claude Code write the composition.
- Inputs: `script.json`, `context.json`, `shots/*.png`.
- Output: `.trailer/<pr>/trailer.mp4`, `preview.gif`, `poster.png`.
- `ffmpeg` (installed in pre-flight) for GIF and poster.

## Approach
1. **Template** `templates/trailer/` (built once, by hand plus the HyperFrames skill):
   - `index.html`: composition at 1280×720 that reads `window.TRAILER` (from `data.js`) and builds the scenes.
   - Scene timeline (`d` = per-scene duration):
     | Scene | Duration | Content |
     |---|---|---|
     | Title | 3 s | `PR #1 · Pricing page redesign · @author`, repo name |
     | Summary | 3 s | `script.summary`, verdict chip |
     | Scene × N | `d` = clamp(18 / N, 4, 6) s | BEFORE (left) / AFTER (right) with a wipe; boxes scale in on AFTER; caption lower third; viewport badge (🖥 / 📱) |
     | Risks | 4 s (if any) | red card, zoom into the AFTER image at the risk's box, description |
     | Outro | 3 s | verdict, "Made with PR Trailers" |
   - Styling: dark background, one accent color, big type.
2. **Instantiate** (`src/stages/render/build.ts`): copy the template to `.trailer/<pr>/video/`, copy the referenced PNGs to `video/assets/`, and write `video/data.js` = `window.TRAILER = {...}` with computed durations and image paths.
3. **Render**: spawn the HyperFrames CLI render command on `video/` → `trailer.mp4`. *(Exact command from pre-flight.)*
4. **Previews** with ffmpeg:
   - GIF: `ffmpeg -t 10 -i trailer.mp4 -vf "fps=12,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" preview.gif`
   - Poster: `ffmpeg -ss 4 -i trailer.mp4 -frames:v 1 poster.png`
   - If the GIF is > 5 MB → re-run with fps=8 and width 560.

## Contracts
`video/data.js` → `window.TRAILER = { pr, title, summary, verdict, scenes: [{ before, after, boxes, caption, detail, viewport, duration }], risks: [{ image, box, description, severity }], totalDuration }`.

## Constitution alignment
Art. V (HyperFrames only), Art. III (re-runnable; reuses cached script and shots), Art. I (design time goes into the template, since that's what the judges see).

## Risks
- HyperFrames learning curve → pre-flight smoke test; start from an official example composition; let the HyperFrames skill in Claude Code write it.
- Render is slow → 1280×720 at 30 fps; keep effects CSS-only.
- Images too tall for the frame → `object-fit: cover` with `object-position` focused on the first box's y position.

## Cut line
1st cut: drop the risks zoom (static red card with text).
2nd cut: no wipe; show BEFORE then AFTER sequentially with a crossfade.
