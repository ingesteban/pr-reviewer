import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { run } from "../../lib/exec.ts";
import { outPath } from "../../lib/fs.ts";
import { log } from "../../lib/log.ts";

export const RELEASE_TAG = "trailers";

export interface Repo {
  nameWithOwner: string;
  visibility: string;
}

export interface AssetUrls {
  mp4: string;
  gif: string;
  poster: string;
}

export async function repoInfo(): Promise<Repo> {
  const { stdout } = await run("gh", ["repo", "view", "--json", "nameWithOwner,visibility"], { timeoutMs: 30_000 });
  const data = JSON.parse(stdout) as { nameWithOwner: string; visibility: string };
  return { nameWithOwner: data.nameWithOwner, visibility: String(data.visibility).toUpperCase() };
}

async function ensureRelease(): Promise<void> {
  try {
    await run("gh", ["release", "view", RELEASE_TAG, "--json", "tagName"], { echo: false, timeoutMs: 30_000 });
  } catch {
    log.info(`creating the "${RELEASE_TAG}" release (one-time, holds the trailer files)`);
    await run("gh", ["release", "create", RELEASE_TAG, "--title", "PR Trailers", "--notes", "Auto-generated PR trailers. Each asset is named pr-<number>-*.", "--prerelease"], {
      timeoutMs: 60_000,
    });
  }
}

/**
 * Upload trailer.mp4 / preview.gif / poster.png as pr-<n>-* assets of the `trailers` release
 * (replacing previous uploads for this PR) and return their public download URLs (FR-1, FR-5).
 */
export async function uploadAssets(pr: number, repo: Repo): Promise<AssetUrls> {
  await ensureRelease();
  const tmp = outPath(pr, "upload");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const names = { mp4: `pr-${pr}-trailer.mp4`, gif: `pr-${pr}-preview.gif`, poster: `pr-${pr}-poster.png` };
  copyFileSync(outPath(pr, "trailer.mp4"), join(tmp, names.mp4));
  copyFileSync(outPath(pr, "preview.gif"), join(tmp, names.gif));
  copyFileSync(outPath(pr, "poster.png"), join(tmp, names.poster));
  try {
    await run("gh", ["release", "upload", RELEASE_TAG, join(tmp, names.mp4), join(tmp, names.gif), join(tmp, names.poster), "--clobber"], {
      timeoutMs: 180_000,
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const base = `https://github.com/${repo.nameWithOwner}/releases/download/${RELEASE_TAG}`;
  const v = Date.now(); // cache-buster so GitHub's image proxy shows the new GIF after re-runs
  return { mp4: `${base}/${names.mp4}`, gif: `${base}/${names.gif}?v=${v}`, poster: `${base}/${names.poster}?v=${v}` };
}
