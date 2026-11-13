# Test plan · 005 — HyperFrames trailer render

Run `bash docs/test-005.sh [PR#]` from the repo root (default PR 1). Local only. Needs FFmpeg and Chrome (`npx hyperframes doctor`).

| Acceptance criterion | Check | Expected |
|---|---|---|
| MP4 rendered with HyperFrames | `npm run trailer -- 1 --stage render --force` | `.trailer/1/trailer.mp4`, plays in QuickTime/Chrome |
| 1280×720, 20–40 s | `ffprobe` | `1280x720`, ~25 s for PR #1 (2 scenes + risk card) |
| Risk card shows the mobile overflow | watch ~18–22 s | red "Needs a look" card zooming into the squeezed mobile cards |
| GIF preview ≤ 5 MB + poster | file sizes | `preview.gif` ~0.6 MB (10 s from the first scene), `poster.png` |
| Under 2 minutes | timer | ~30 s on an M3 Pro |
| Composition follows the HyperFrames contract | `npx hyperframes check` in `.trailer/1/video/` | 0 errors (editing-structure warnings are OK) |
| Visual review (manual) | `open .trailer/1/trailer.mp4` | captions readable, boxes on the changed areas, phone frames on mobile |

Iterate faster with `TRAILER_QUALITY=draft npm run trailer -- 1 --stage render --force`.
