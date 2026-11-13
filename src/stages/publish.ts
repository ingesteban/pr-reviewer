import { outPath } from "../lib/fs.ts";
import type { Stage } from "../lib/stage.ts";

// Stub — implemented in feature 006.
export const publishStage: Stage = {
  name: "publish",
  output: (pr) => outPath(pr, "published.json"),
  async run() {
    throw new Error("not implemented (feature 006)");
  },
};
