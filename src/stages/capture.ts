import { outPath } from "../lib/fs.ts";
import type { Stage } from "../lib/stage.ts";

// Stub — implemented in feature 003.
export const captureStage: Stage = {
  name: "capture",
  output: (pr) => outPath(pr, "changes.json"),
  async run() {
    throw new Error("not implemented (feature 003)");
  },
};
