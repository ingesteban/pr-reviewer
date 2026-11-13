import { outPath, readJson, writeJson } from "../lib/fs.ts";
import { log } from "../lib/log.ts";
import { ChangesSchema, ContextSchema, type Script, ScriptSchema } from "../lib/schema.ts";
import type { Stage } from "../lib/stage.ts";
import { fallbackScript } from "./narrate/fallback.ts";
import { measureOverflow, overflowRisks } from "./narrate/facts.ts";
import { narrateWithGemini } from "./narrate/gemini.ts";
import { prepareImages } from "./narrate/images.ts";

const MAX_CAPTURES = 4;

export const narrateStage: Stage = {
  name: "narrate",
  output: (pr) => outPath(pr, "script.json"),
  async run({ pr, cfg }) {
    const context = await readJson(outPath(pr, "context.json"), ContextSchema);
    const { captures } = await readJson(outPath(pr, "changes.json"), ChangesSchema);

    // Only changed captures go to Gemini (FR-5), most-changed first, at most 4 (8 images).
    const changed = captures.filter((c) => !c.unchanged).slice(0, MAX_CAPTURES);
    if (!changed.length) throw new Error("No visual changes found in changes.json — nothing to narrate");
    const facts = measureOverflow(pr, changed, cfg);
    for (const f of facts) log.info(`layout check: ${f.captureId} is ${f.pageWidth}px wide on a ${f.viewportWidth}px viewport`);

    let script: Script;
    try {
      const prepared = changed.map((capture) => ({ capture, images: prepareImages(pr, capture) }));
      script = await narrateWithGemini({ context, captures: prepared, facts });
      // Never lose a measured overflow, even if Gemini missed it.
      for (const risk of overflowRisks(facts)) {
        if (!script.risks.some((r) => r.captureId === risk.captureId)) script.risks.push(risk);
      }
      if (script.risks.some((r) => r.severity !== "low")) script.verdict = "needs-a-look";
    } catch (error) {
      log.warn(`Gemini failed: ${error instanceof Error ? error.message : String(error)} → using fallback`);
      script = fallbackScript(context, changed, facts);
    }

    await writeJson(this.output(pr), script, ScriptSchema);
    log.info(`“${script.title}” — ${script.summary}`);
    for (const s of script.scenes) log.info(`🎬 ${s.captureId.padEnd(18)} ${s.caption}`);
    for (const r of script.risks) log.info(`${r.severity === "high" ? "🔴" : r.severity === "medium" ? "🟠" : "🟡"} ${r.captureId.padEnd(18)} ${r.description}`);
    return `${script.source}${script.model ? ` (${script.model})` : ""} · ${script.scenes.length} scenes, ${script.risks.length} risk${script.risks.length === 1 ? "" : "s"}`;
  },
};
