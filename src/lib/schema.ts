import { z } from "zod";

// trailer.config.json
export const ConfigSchema = z.object({
  app: z.object({
    dir: z.string(),
    build: z.string(),
    preview: z.string(),
    basePort: z.number().int(),
    headPort: z.number().int(),
  }),
  routes: z
    .array(z.object({ path: z.string().startsWith("/"), sources: z.array(z.string()).min(1) }))
    .min(1),
  globalSources: z.array(z.string()).default([]),
  viewports: z
    .array(
      z.object({
        name: z.enum(["desktop", "mobile"]),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type Config = z.infer<typeof ConfigSchema>;

// .trailer/<pr>/context.json (feature 002)
export const ContextSchema = z.object({
  pr: z.object({
    number: z.number().int().positive(),
    title: z.string(),
    body: z.string(),
    author: z.string(),
    base: z.string(),
    head: z.string(),
    url: z.string().url(),
  }),
  files: z.array(z.object({ path: z.string(), additions: z.number(), deletions: z.number() })),
  diff: z.string(),
  diffTruncated: z.boolean(),
  routes: z.array(z.string()).min(1),
  routeReason: z.enum(["matched", "global-source", "fallback-all"]),
});
export type Context = z.infer<typeof ContextSchema>;

// .trailer/<pr>/changes.json (feature 003)
export const BoxSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type Box = z.infer<typeof BoxSchema>;

export const CaptureSchema = z.object({
  id: z.string(), // "<route-slug>.<viewport>", e.g. "pricing.mobile"
  route: z.string(),
  viewport: z.enum(["desktop", "mobile"]),
  width: z.number().int().positive(), // compared (padded) image size
  height: z.number().int().positive(),
  base: z.string(), // paths relative to .trailer/<pr>/
  head: z.string(),
  diff: z.string(),
  diffRatio: z.number().min(0).max(1),
  unchanged: z.boolean(),
  boxes: z.array(BoxSchema).max(5),
});
export type Capture = z.infer<typeof CaptureSchema>;

export const ChangesSchema = z.object({ captures: z.array(CaptureSchema).min(1) });
export type Changes = z.infer<typeof ChangesSchema>;

// .trailer/<pr>/script.json (feature 004)
export const SceneSchema = z.object({
  captureId: z.string(),
  caption: z.string().min(1), // ≤ 12 words
  detail: z.string(), // ≤ 25 words
  focusBox: z.number().int().nonnegative(),
});
export const RiskSchema = z.object({
  captureId: z.string(),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});
export const ScriptSchema = z.object({
  source: z.enum(["gemini", "fallback"]),
  model: z.string().optional(),
  title: z.string().min(1), // ≤ 8 words
  summary: z.string(), // ≤ 20 words
  verdict: z.enum(["looks-good", "needs-a-look"]),
  scenes: z.array(SceneSchema).min(1),
  risks: z.array(RiskSchema),
});
export type Scene = z.infer<typeof SceneSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Script = z.infer<typeof ScriptSchema>;

/** Truncate to at most n words (constitution Art. IV: clamp instead of reject). */
export const clampWords = (text: string, n: number): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= n ? words.join(" ") : `${words.slice(0, n).join(" ")}…`;
};

export function clampScript(script: Script): Script {
  return {
    ...script,
    title: clampWords(script.title, 8),
    summary: clampWords(script.summary, 20),
    scenes: script.scenes.map((s) => ({ ...s, caption: clampWords(s.caption, 12), detail: clampWords(s.detail, 25) })),
    risks: script.risks.map((r) => ({ ...r, description: clampWords(r.description, 25) })),
  };
}
