# Test plan · 006 — Publish the trailer to the PR

Run `bash docs/test-006.sh [PR#]` from the repo root (default PR 1). **Writes to GitHub**: uploads to the `trailers` release and posts or edits one comment on the PR.

| Acceptance criterion | Check | Expected |
|---|---|---|
| Assets uploaded to the `trailers` release | `gh release view trailers` | `pr-1-trailer.mp4`, `pr-1-preview.gif`, `pr-1-poster.png` |
| Comment with inline GIF → MP4 | `gh pr view 1 --web` | animated GIF in the conversation; clicking it opens the MP4 |
| Verdict and risks in the comment | comment body | ⚠️ Needs a look + 🔴 high risk about the mobile overflow |
| Re-runs edit the same comment | run publish twice | `published.json` → `"action": "updated"`; exactly 1 PR Trailers comment |
| Comment URL printed | terminal | `🎬 Trailer created/updated on PR #1: https://github.com/...` |
| Assets reachable | `curl -L` each URL | HTTP 200 |
| End to end | `rm -rf .trailer/1 && npm run trailer -- 1` | all 5 stages ✔ in ~1 min |

Manual (one-time, for the submission video only): drag `.trailer/1/trailer.mp4` into a new PR #1 comment in the browser to get GitHub's inline video player.
