# Tasks · 005 — HyperFrames trailer render

> The template is what the judges see. Spend the design time here.

## T1 — Template with static sample data
**Files:** `templates/trailer/{index.html,styles.css,sample-data.js}`
**Prompt:**
> Using the HyperFrames skill and docs, write a 1280×720 HyperFrames composition that reads `window.TRAILER` (shape in plan.md) and renders the scene timeline from plan.md: title, summary, N before/after scenes (wipe from BEFORE to AFTER, highlight boxes scaling in over the AFTER image, caption as a lower third, viewport badge), an optional risks card (red, zoom into the risk box), and an outro. Dark background, one accent color, minimum font size 28 px. Animations must be seekable/deterministic as HyperFrames requires. Include `sample-data.js` built from `.trailer/1/` outputs so it can be previewed on its own.
**Acceptance:** the HyperFrames preview shows the full sequence with the sample data.

## T2 — Instantiate per PR [depends T1]
**Files:** `src/stages/render/build.ts`
**Prompt:**
> Copy `templates/trailer` to `.trailer/<pr>/video/`, copy the PNGs referenced in script scenes and risks to `video/assets/`, compute durations (scene d = clamp(18/N, 4, 6) s; risks 4 s if present; title/summary/outro 3 s each) and write `video/data.js` as `window.TRAILER = <json>`. The index.html must load data.js instead of sample-data.js.

## T3 — Render + previews [depends T2]
**Files:** `src/stages/render.ts`
**Prompt:**
> Spawn the HyperFrames render command on `.trailer/<pr>/video/` producing `.trailer/<pr>/trailer.mp4` (stream its progress output to the console). Then run the ffmpeg GIF (palette, fps 12, width 640, first 10 s) and poster commands from plan.md; if the GIF is > 5 MB, regenerate it at fps 8 and width 560.
**Acceptance:** all 3 files exist; the MP4 duration is 20–40 s (`ffprobe`).

## T4 — Tests
- `npm run trailer -- 1 --stage render --force` → `trailer.mp4`, `preview.gif`, `poster.png`.
- `ffprobe -v error -show_entries format=duration -of csv=p=0 .trailer/1/trailer.mp4` → between 20 and 40.
- `ls -lh .trailer/1/preview.gif` → ≤ 5 MB.
- Watch the MP4: captions readable, boxes aligned with the changed areas, risks card present.
