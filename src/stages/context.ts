import picomatch from "picomatch";
import { run } from "../lib/exec.ts";
import { outPath, writeJson } from "../lib/fs.ts";
import { log } from "../lib/log.ts";
import { type Config, type Context, ContextSchema } from "../lib/schema.ts";
import type { Stage } from "../lib/stage.ts";

export const MAX_DIFF_CHARS = 12_000;

const PR_FIELDS = "number,title,body,author,baseRefName,headRefName,url,files";

interface GhPr {
  number: number;
  title: string;
  body: string;
  author: { login: string };
  baseRefName: string;
  headRefName: string;
  url: string;
  files: { path: string; additions: number; deletions: number }[];
}

/** Map changed files to the routes they affect (FR-5, FR-6). */
export function mapRoutes(changed: string[], cfg: Config): Pick<Context, "routes" | "routeReason"> {
  const allRoutes = cfg.routes.map((r) => r.path);
  const isGlobal = picomatch(cfg.globalSources.length ? cfg.globalSources : ["\0"]);
  if (changed.some((file) => isGlobal(file))) return { routes: allRoutes, routeReason: "global-source" };

  const matched = cfg.routes.filter((route) => {
    const isMatch = picomatch(route.sources);
    return changed.some((file) => isMatch(file));
  });
  if (matched.length) return { routes: matched.map((r) => r.path), routeReason: "matched" };
  return { routes: allRoutes, routeReason: "fallback-all" };
}

export function truncateDiff(diff: string, max = MAX_DIFF_CHARS): { diff: string; diffTruncated: boolean } {
  if (diff.length <= max) return { diff, diffTruncated: false };
  return { diff: `${diff.slice(0, max)}\n… [diff truncated at ${max} chars]`, diffTruncated: true };
}

export const contextStage: Stage = {
  name: "context",
  output: (pr) => outPath(pr, "context.json"),
  async run({ pr, cfg }) {
    const view = await run("gh", ["pr", "view", String(pr), "--json", PR_FIELDS], { timeoutMs: 30_000 });
    const data = JSON.parse(view.stdout) as GhPr;
    const { stdout: rawDiff } = await run("gh", ["pr", "diff", String(pr)], { timeoutMs: 30_000 });

    const files = data.files.map(({ path, additions, deletions }) => ({ path, additions, deletions }));
    const { routes, routeReason } = mapRoutes(files.map((f) => f.path), cfg);
    const context: Context = {
      pr: {
        number: data.number,
        title: data.title,
        body: data.body ?? "",
        author: data.author?.login ?? "unknown",
        base: data.baseRefName,
        head: data.headRefName,
        url: data.url,
      },
      files,
      ...truncateDiff(rawDiff),
      routes,
      routeReason,
    };
    await writeJson(this.output(pr), context, ContextSchema);

    log.info(`“${context.pr.title}” by @${context.pr.author} · ${context.pr.head} → ${context.pr.base}`);
    log.info(`${files.length} files changed · routes: ${routes.join(", ")} (${routeReason})`);
    return `${routes.length} route${routes.length === 1 ? "" : "s"}`;
  },
};
