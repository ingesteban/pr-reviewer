import { resolve } from "node:path";
import { readJson, repoRoot } from "./fs.ts";
import { type Config, ConfigSchema } from "./schema.ts";

export const CONFIG_FILE = "trailer.config.json";

export function loadConfig(): Promise<Config> {
  return readJson(resolve(repoRoot(), CONFIG_FILE), ConfigSchema);
}
