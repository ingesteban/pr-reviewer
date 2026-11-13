import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { run, spawnBackground, type BackgroundProcess } from "../../lib/exec.ts";
import { outPath, repoRoot } from "../../lib/fs.ts";
import { log } from "../../lib/log.ts";
import type { Config, Context } from "../../lib/schema.ts";

export type Side = "base" | "head";

export interface PreparedSide {
  side: Side;
  url: string;
  stop(): Promise<void>;
}

const worktreePath = (pr: number, side: Side): string => outPath(pr, `wt-${side}`);
const headRef = (pr: number): string => `refs/trailer/pr-${pr}`;

/** Kill whatever is listening on a port (a crashed earlier run). */
export async function freePort(port: number): Promise<void> {
  await run("sh", ["-c", `lsof -ti tcp:${port} | xargs kill -9 2>/dev/null; true`], { echo: false });
}

/** Remove a leftover worktree from an interrupted run. */
export async function removeWorktree(path: string): Promise<void> {
  await run("git", ["worktree", "remove", "--force", path], { echo: false }).catch(() => undefined);
  await run("git", ["worktree", "prune"], { echo: false }).catch(() => undefined);
}

async function waitForHttp(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Preview server did not answer at ${url} within ${timeoutMs / 1000}s`);
}

/** Reuse the main checkout's node_modules when the lockfile is identical (fast); otherwise install. */
async function installDeps(appDir: string, mainAppDir: string): Promise<void> {
  if (existsSync(join(appDir, "node_modules"))) return;
  const lock = (dir: string) => {
    try {
      return readFileSync(join(dir, "package-lock.json"), "utf8");
    } catch {
      return null;
    }
  };
  const mainModules = join(mainAppDir, "node_modules");
  if (existsSync(mainModules) && lock(appDir) !== null && lock(appDir) === lock(mainAppDir)) {
    symlinkSync(mainModules, join(appDir, "node_modules"), "dir");
    log.info(`reusing node_modules from ${mainAppDir}`);
    return;
  }
  await run("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund"], { cwd: appDir, timeoutMs: 300_000 });
}

/**
 * Check out one side of the PR in its own git worktree (never touching the user's tree, Art. XI),
 * build it and serve it with the app's preview command.
 */
export async function prepareSide(pr: number, side: Side, context: Context, cfg: Config): Promise<PreparedSide> {
  const wt = worktreePath(pr, side);
  const port = side === "base" ? cfg.app.basePort : cfg.app.headPort;
  await removeWorktree(wt);
  await freePort(port);

  // Check out the right commit.
  if (side === "base") {
    await run("git", ["fetch", "--quiet", "origin", context.pr.base], { timeoutMs: 60_000 });
    await run("git", ["worktree", "add", "--force", "--detach", wt, `origin/${context.pr.base}`]);
  } else {
    await run("git", ["fetch", "--quiet", "origin", `+pull/${pr}/head:${headRef(pr)}`], { timeoutMs: 60_000 });
    await run("git", ["worktree", "add", "--force", "--detach", wt, headRef(pr)]);
  }

  let server: BackgroundProcess | undefined;
  const stop = async (): Promise<void> => {
    server?.kill();
    await freePort(port);
    await removeWorktree(wt);
    if (side === "head") await run("git", ["update-ref", "-d", headRef(pr)], { echo: false }).catch(() => undefined);
  };

  try {
    const appDir = join(wt, cfg.app.dir);
    await installDeps(appDir, resolve(repoRoot(), cfg.app.dir));
    await run("sh", ["-c", cfg.app.build], { cwd: appDir, timeoutMs: 180_000 });
    server = spawnBackground("sh", ["-c", cfg.app.preview.replace("{port}", String(port))], { cwd: appDir });
    const url = `http://localhost:${port}`;
    await waitForHttp(`${url}/`);
    log.info(`${side} ready at ${url} (${side === "base" ? `origin/${context.pr.base}` : `PR #${pr} head`})`);
    return { side, url, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
