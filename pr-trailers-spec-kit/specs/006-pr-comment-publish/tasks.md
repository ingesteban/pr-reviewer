# Tasks · 006 — Publish the trailer to the PR

> Refreshing the PR page is the demo's payoff moment. It must work every time.

## T1 — Release upload
**Files:** `src/stages/publish/release.ts`
**Prompt:**
> Implement `uploadAssets(pr)`: resolve nameWithOwner with gh, ensure the `trailers` release exists (create it as a prerelease if missing), copy trailer.mp4/preview.gif/poster.png to `pr-<n>-*` names in a temp dir, `gh release upload trailers ... --clobber`, and return their download URLs (with a `?v=<timestamp>` cache-buster on the GIF and PNG).
**Acceptance:** the assets are visible on the repo's Releases page and the URLs download.

## T2 — Comment body [P]
**Files:** `src/stages/publish/body.ts`
**Prompt:**
> Build the markdown body from plan.md step 5, using script.json + URLs: hidden marker, title, GIF linked to the MP4, summary, verdict emoji, risks list with severity emoji (🔴 high, 🟠 medium, 🟡 low; omit the section if there are no risks), footer.

## T3 — Create or update the comment [depends T1, T2]
**Files:** `src/stages/publish.ts`
**Prompt:**
> Find an existing comment containing `<!-- pr-trailer -->` via `gh api ... --paginate`; PATCH it if found, otherwise `gh pr comment <n> --body-file`. Write `.trailer/<n>/published.json` with the comment URL and asset URLs; print the comment URL in bold.

## T4 — Tests
- `npm run trailer -- 1 --stage publish --force` → the comment URL is printed; the PR shows the animated GIF.
- Run it again → still exactly 1 PR Trailers comment, with the updated content.
- Click the GIF → the MP4 plays/downloads.
- Full run from scratch: `rm -rf .trailer/1 && npm run trailer -- 1` → end to end in under 4 minutes.
