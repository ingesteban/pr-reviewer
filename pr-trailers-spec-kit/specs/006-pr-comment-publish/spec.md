# Spec · 006 — Publish the trailer to the PR

**Estado:** Aprobada · **Origin:** hackathon plan · **Priority:** High · **Depends:** 005
**Budget:** 30 min (4:00–4:30)

## Why
The trailer only matters if it shows up where review happens. This is the payoff moment of the live demo: refresh the PR page and the trailer is there.

## User stories
- **US-1.** As a reviewer, I want the trailer to play inline in the PR conversation, so I see it without clicking anywhere.
- **US-2.** As a reviewer, I want the full MP4 one click away, along with the summary and risks as text.
- **US-3.** As the presenter, I want re-runs to update the same comment, not spam the PR.

## Functional requirements (EARS)
- **FR-1.** WHEN publish runs, THE SYSTEM SHALL upload `trailer.mp4`, `preview.gif` and `poster.png` to a dedicated GitHub release (`trailers`) in the repo, named per PR (`pr-<n>-trailer.mp4`, …), replacing any previous upload for that PR.
- **FR-2.** THE SYSTEM SHALL post a PR comment containing: the inline GIF preview linking to the MP4, the trailer title and summary, the verdict, the risks as a list (with severity), and a footer "🎬 Made with PR Trailers".
- **FR-3.** IF a PR Trailers comment already exists on the PR (identified by a hidden marker), THE SYSTEM SHALL edit it instead of creating a new one.
- **FR-4.** WHEN publish finishes, THE SYSTEM SHALL print the comment URL.
- **FR-5.** IF the release does not exist, THE SYSTEM SHALL create it.

## Acceptance criteria
- [ ] After `npm run trailer -- 1`, PR #1 shows one comment with an animated GIF; clicking it opens the MP4.
- [ ] Running it again updates that comment (still only one).
- [ ] The risks list shows the mobile overflow.

## Out of scope
GitHub App, checks/status API, posting to Slack.

## Clarifications (resolved)
- ✅ Release assets for hosting: the API/`gh` can't upload attachments the way the GitHub web UI does, and release assets need no extra service.
- ✅ The repo must be **public**, so the GIF renders inline through GitHub's image proxy.
- ✅ One-time manual step for the submission video only: drag PR #1's `trailer.mp4` into a comment in the GitHub web UI so it shows an inline video player. The automated pipeline still posts GIF + MP4 link on every PR (decided 2026-11-13). Listed in 007 tasks.
