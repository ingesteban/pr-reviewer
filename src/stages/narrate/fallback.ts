import type { Capture, Context, Script } from "../../lib/schema.ts";
import { clampScript } from "../../lib/schema.ts";
import { type LayoutFact, overflowRisks } from "./facts.ts";

const routeLabel = (route: string): string => (route === "/" ? "home page" : route.replace(/^\//, "").replace(/\.html?$/, " page"));

/** Template script used when Gemini is unavailable (constitution Art. IV). Always valid. */
export function fallbackScript(context: Context, changed: Capture[], facts: LayoutFact[]): Script {
  const risks = overflowRisks(facts);
  const screens = new Set(changed.map((c) => c.route)).size;
  return clampScript({
    source: "fallback",
    title: context.pr.title,
    summary: `Visual changes on ${screens} screen${screens === 1 ? "" : "s"}.`,
    verdict: risks.length ? "needs-a-look" : "looks-good",
    scenes: changed.map((c) => ({
      captureId: c.id,
      caption: `Updated ${routeLabel(c.route)} (${c.viewport})`,
      detail: `${(c.diffRatio * 100).toFixed(1)}% of the screen changed across ${c.boxes.length} region${c.boxes.length === 1 ? "" : "s"}.`,
      focusBox: 0,
    })),
    risks,
  });
}
