import { parseArgs } from "node:util";
import dotenv from "dotenv";
import { CONFIG_FILE, loadConfig } from "./lib/config.ts";
import { log } from "./lib/log.ts";
import { STAGE_NAMES, type StageName } from "./lib/stage.ts";
import { runPipeline } from "./runner.ts";
import { stages } from "./stages/index.ts";

const USAGE = `Usage: npm run trailer -- <PR#> [--stage <name>] [--force]

  <PR#>            pull request number in the current repo
  --stage <name>   run only one stage: ${STAGE_NAMES.join(" | ")}
  --force          re-run stages even if their output already exists
  --help           show this help

Outputs go to .trailer/<PR#>/. Run from the repo root (where ${CONFIG_FILE} lives).`;

async function main(): Promise<number> {
  dotenv.config();

  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        stage: { type: "string" },
        force: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    console.error((error as Error).message + "\n\n" + USAGE);
    return 1;
  }
  const { values, positionals } = parsed;

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const pr = Number(positionals[0]);
  if (!Number.isInteger(pr) || pr <= 0) {
    console.error(`Missing or invalid PR number.\n\n${USAGE}`);
    return 1;
  }

  const only = values.stage as StageName | undefined;
  if (only && !STAGE_NAMES.includes(only)) {
    console.error(`Unknown stage "${only}". Valid stages: ${STAGE_NAMES.join(", ")}`);
    return 1;
  }

  let cfg;
  try {
    cfg = await loadConfig();
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }

  log.title(`PR #${pr}${only ? ` · stage ${only}` : ""}${values.force ? " · --force" : ""}`);
  const ok = await runPipeline({ pr, cfg, stages, only, force: values.force });
  if (ok && !only) log.success(`Done. Outputs in .trailer/${pr}/`);
  return ok ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
