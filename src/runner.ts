import { exists, ensureDir, outDir } from "./lib/fs.ts";
import { log } from "./lib/log.ts";
import type { Config } from "./lib/schema.ts";
import type { Stage, StageName } from "./lib/stage.ts";

export interface RunPipelineOptions {
  pr: number;
  cfg: Config;
  stages: Stage[];
  only?: StageName;
  force?: boolean;
}

/** Runs the stages in order (FR-1), one stage only (FR-2), skipping cached ones (FR-3). Returns false on failure (FR-7). */
export async function runPipeline({ pr, cfg, stages, only, force = false }: RunPipelineOptions): Promise<boolean> {
  await ensureDir(outDir(pr));
  const selected = only ? stages.filter((s) => s.name === only) : stages;

  for (const stage of selected) {
    if (!force && exists(stage.output(pr))) {
      log.cached(stage.name);
      continue;
    }
    log.start(stage.name);
    const startedAt = Date.now();
    try {
      const detail = await stage.run({ pr, cfg });
      log.done(stage.name, Date.now() - startedAt, detail ?? "");
    } catch (error) {
      log.fail(stage.name, error, `npm run trailer -- ${pr} --stage ${stage.name} --force`);
      return false;
    }
  }
  return true;
}
