import type { Script } from "../../lib/schema.ts";
import type { AssetUrls } from "./release.ts";

/** Hidden marker that identifies the PR Trailers comment, so re-runs edit it instead of adding a new one (FR-3). */
export const MARKER = "<!-- pr-trailer -->";

const SEVERITY_ICON = { high: "🔴", medium: "🟠", low: "🟡" } as const;

const md = (s: string): string => s.replace(/([\\`*_[\]<>|])/g, "\\$1");

/** The PR comment (FR-2): inline GIF linking to the MP4, summary, verdict, risks, footer. */
export function buildBody(script: Script, urls: AssetUrls): string {
  const verdict = script.verdict === "looks-good" ? "✅ **Looks good**" : "⚠️ **Needs a look**";
  const lines = [
    MARKER,
    `### 🎬 PR Trailer: ${md(script.title)}`,
    "",
    `[![PR trailer: click to watch the full video](${urls.gif})](${urls.mp4})`,
    "",
    `${verdict} · ${md(script.summary)}`,
  ];
  if (script.risks.length) {
    lines.push("", "**Risks**");
    for (const r of script.risks) lines.push(`- ${SEVERITY_ICON[r.severity]} **${r.severity}** · ${md(r.description)} \`${r.captureId}\``);
  }
  lines.push("", "<details><summary>Scenes in this trailer</summary>", "");
  for (const s of script.scenes) lines.push(`- \`${s.captureId}\` · ${md(s.caption)}`);
  lines.push("", "</details>", "");
  const narrator = script.source === "gemini" && script.model ? `narrated by ${script.model}` : "template narration";
  lines.push(`<sub>🎬 Made with PR Trailers · ${narrator} · rendered with HyperFrames · ▶️ [Full trailer (MP4)](${urls.mp4})</sub>`);
  return `${lines.join("\n")}\n`;
}
