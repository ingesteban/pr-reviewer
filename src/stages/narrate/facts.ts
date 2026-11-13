import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { outPath } from "../../lib/fs.ts";
import type { Capture, Config, Risk } from "../../lib/schema.ts";

export interface LayoutFact {
  captureId: string;
  viewportWidth: number;
  pageWidth: number; // natural width of the head (PR) screenshot
}

/** Natural width of a PNG, read from its header only. */
function pngWidth(path: string): number {
  return PNG.sync.read(readFileSync(path)).width;
}

/**
 * Deterministic layout check: a page wider than its viewport overflows horizontally.
 * Used as a hint in the Gemini prompt and as a risk in the fallback script.
 */
export function measureOverflow(pr: number, captures: Capture[], cfg: Config): LayoutFact[] {
  const facts: LayoutFact[] = [];
  for (const c of captures) {
    const viewportWidth = cfg.viewports.find((v) => v.name === c.viewport)?.width ?? c.width;
    const pageWidth = pngWidth(outPath(pr, c.head));
    if (pageWidth > viewportWidth + 1) facts.push({ captureId: c.id, viewportWidth, pageWidth });
  }
  return facts;
}

export function overflowRisks(facts: LayoutFact[]): Risk[] {
  return facts.map((f) => ({
    captureId: f.captureId,
    description: `Page is ${f.pageWidth}px wide on a ${f.viewportWidth}px screen, so content overflows sideways`,
    severity: "high",
  }));
}
