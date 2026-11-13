import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ZodType, ZodTypeAny, z } from "zod";

/** Repo root = the directory the CLI is run from (where trailer.config.json lives). */
export const repoRoot = (): string => process.cwd();

/** All stage outputs for a PR live here (constitution Art. III). */
export const outDir = (pr: number): string => resolve(repoRoot(), ".trailer", String(pr));

export const outPath = (pr: number, ...parts: string[]): string => join(outDir(pr), ...parts);

export const exists = (path: string): boolean => existsSync(path);

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readJson<S extends ZodTypeAny>(path: string, schema: S): Promise<z.output<S>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`Missing file ${path}. Run the earlier stage first.`);
  }
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Invalid ${path}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

export async function writeJson<T>(path: string, data: T, schema?: ZodType<T, any, any>): Promise<void> {
  const value = schema ? schema.parse(data) : data;
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}
