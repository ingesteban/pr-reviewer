# Plan · 006 — Publish the trailer to the PR

## Technical context
- `gh` CLI: `gh release view/create/upload`, `gh api`, `gh pr comment`, `gh repo view --json nameWithOwner`.
- Inputs: `trailer.mp4`, `preview.gif`, `poster.png`, `script.json`, `context.json`.
- Output: `.trailer/<pr>/published.json` (`{ commentUrl, assets }`). This is the stage's cache file.

## Approach
1. `nameWithOwner` ← `gh repo view --json nameWithOwner -q .nameWithOwner`.
2. Release: `gh release view trailers` || `gh release create trailers --title "PR Trailers" --notes "Auto-generated PR trailers" --prerelease`.
3. Copy the files to temp names `pr-<n>-trailer.mp4`, `pr-<n>-preview.gif`, `pr-<n>-poster.png`, then `gh release upload trailers <files> --clobber`.
4. Asset URL: `https://github.com/<owner>/<repo>/releases/download/trailers/<name>`. Append `?v=<timestamp>` to the GIF URL so GitHub's image cache refreshes after re-runs.
5. Body (markdown):
   ```md
   <!-- pr-trailer -->
   ### 🎬 PR Trailer: <title>
   [![PR trailer](<gif-url>)](<mp4-url>)
   **<summary>** · Verdict: ✅ Looks good | ⚠️ Needs a look
   **Risks**
   - 🔴 high · <description> (<captureId>)
   <sub>Made with PR Trailers · Gemini + HyperFrames · ▶️ [Full trailer (MP4)](<mp4-url>)</sub>
   ```
6. Find the existing comment: `gh api repos/<o>/<r>/issues/<n>/comments --paginate -q '.[] | select(.body | contains("<!-- pr-trailer -->")) | .id'`.
   - Found → `gh api -X PATCH repos/<o>/<r>/issues/comments/<id> -f body=@body.md`. *(Use `-F body=@file` or pass the body as a field. Verify the gh syntax.)*
   - Not found → `gh pr comment <n> --body-file body.md`.
7. Write `published.json` and print the URL.

## Constitution alignment
Art. IX exception: the publish stage writes to GitHub by design, but only to the `trailers` release and PR comments. Never to branches. Art. III (cached via `published.json`).

## Risks
- GIF doesn't render inline (private repo or cache) → the repo is public; cache-buster query string; fallback: the poster PNG linking to the MP4.
- `gh api` body-from-file syntax → test it once with a dummy comment.

## Cut line
Always create a new comment (skip the edit-existing logic).
