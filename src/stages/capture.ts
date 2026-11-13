import { outPath, readJson, writeJson } from "../lib/fs.ts";
import { log } from "../lib/log.ts";
import { type Capture, type Changes, ChangesSchema, ContextSchema } from "../lib/schema.ts";
import type { Stage } from "../lib/stage.ts";
import { diffPair } from "./capture/diff.ts";
import { type PreparedSide, prepareSide } from "./capture/serve.ts";
import { shootAll } from "./capture/shoot.ts";

const UNCHANGED_BELOW = 0.001; // < 0.1% of pixels changed

export const captureStage: Stage = {
  name: "capture",
  output: (pr) => outPath(pr, "changes.json"),
  async run({ pr, cfg }) {
    const context = await readJson(outPath(pr, "context.json"), ContextSchema);
    const sides: PreparedSide[] = [];
    const cleanup = async () => {
      await Promise.all(sides.map((s) => s.stop()));
    };
    const onSignal = () => {
      log.warn("interrupted — stopping preview servers and removing worktrees");
      void cleanup().finally(() => process.exit(130));
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);

    try {
      // Build base and head in parallel; if one fails, the other is still cleaned up.
      const results = await Promise.allSettled([
        prepareSide(pr, "base", context, cfg),
        prepareSide(pr, "head", context, cfg),
      ]);
      for (const r of results) if (r.status === "fulfilled") sides.push(r.value);
      const failed = results.find((r) => r.status === "rejected");
      if (failed) throw (failed as PromiseRejectedResult).reason;

      const urls = { base: sides[0].url, head: sides[1].url };
      log.info(`shooting ${context.routes.length} route(s) × ${cfg.viewports.length} viewport(s)`);
      const shots = await shootAll(pr, context.routes, cfg, urls);

      const captures: Capture[] = shots.map((shot) => {
        const diff = `shots/${shot.id}.diff.png`;
        const result = diffPair(outPath(pr, shot.base), outPath(pr, shot.head), outPath(pr, diff));
        return {
          ...shot,
          diff,
          width: result.width,
          height: result.height,
          diffRatio: Number(result.diffRatio.toFixed(5)),
          unchanged: result.diffRatio < UNCHANGED_BELOW,
          boxes: result.boxes,
        };
      });
      captures.sort((a, b) => b.diffRatio - a.diffRatio);

      const changes: Changes = { captures };
      await writeJson(this.output(pr), changes, ChangesSchema);

      for (const c of captures) {
        const pct = (c.diffRatio * 100).toFixed(1).padStart(5);
        log.info(`${c.unchanged ? "·" : "◆"} ${c.id.padEnd(22)} ${pct}% changed${c.unchanged ? " (unchanged)" : ` · ${c.boxes.length} region(s)`}`);
      }
      const changed = captures.filter((c) => !c.unchanged).length;
      return `${captures.length} captures, ${changed} changed`;
    } finally {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      await cleanup();
    }
  },
};
