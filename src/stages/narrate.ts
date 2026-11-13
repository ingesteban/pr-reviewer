import { outPath } from "../lib/fs.ts";
import type { Stage } from "../lib/stage.ts";

// Stub — implemented in feature 004.
export const narrateStage: Stage = {
  name: "narrate",
  output: (pr) => outPath(pr, "script.json"),
  async run() {
    throw new Error("not implemented (feature 004)");
  },
};
