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
