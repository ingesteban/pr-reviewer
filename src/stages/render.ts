import { outPath } from "../lib/fs.ts";
import type { Stage } from "../lib/stage.ts";

// Stub — implemented in feature 005.
export const renderStage: Stage = {
  name: "render",
  output: (pr) => outPath(pr, "trailer.mp4"),
  async run() {
    throw new Error("not implemented (feature 005)");
  },
};
