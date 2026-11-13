import type { Config } from "./schema.ts";

export const STAGE_NAMES = ["context", "capture", "narrate", "render", "publish"] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export interface StageContext {
  pr: number;
  cfg: Config;
}

export interface Stage {
  name: StageName;
  /** The file whose existence means the stage is done (its cache key, constitution Art. IX). */
  output: (pr: number) => string;
  /** Runs the stage. May return a short detail shown next to the ✔ line. */
  run: (ctx: StageContext) => Promise<string | void>;
}
