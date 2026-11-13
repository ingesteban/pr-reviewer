import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import { run } from "../lib/exec.ts";
import { outPath, readJson, repoRoot } from "../lib/fs.ts";
import { log } from "../lib/log.ts";
import { ChangesSchema, ContextSchema, ScriptSchema } from "../lib/schema.ts";
import type { Stage } from "../lib/stage.ts";
import { buildComposition } from "./render/build.ts";

const GIF_MAX_BYTES = 5 * 1024 * 1024;
const HYPERFRAMES_VERSION = "0.9.42";

/** The project's pinned HyperFrames CLI, or npx at the same version. */
function hyperframes(): { cmd: string; args: string[] } {
  const local = resolve(repoRoot(), "node_modules/.bin/hyperframes");
  return existsSync(local) ? { cmd: local, args: [] } : { cmd: "npx", args: ["--yes", `hyperframes@${HYPERFRAMES_VERSION}`] };
}

async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { echo: false });
  return Number.parseFloat(stdout.trim());
}

async function makeGif(mp4: string, gif: string, start: number, fps: number, width: number): Promise<void> {
  const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
  await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(start), "-t", "10", "-i", mp4, "-vf", filter, "-loop", "0", gif], { echo: false, timeoutMs: 120_000 });
}

export const renderStage: Stage = {
  name: "render",
  output: (pr) => outPath(pr, "trailer.mp4"),
  async run({ pr, cfg }) {
    const context = await readJson(outPath(pr, "context.json"), ContextSchema);
    const { captures } = await readJson(outPath(pr, "changes.json"), ChangesSchema);
    const script = await readJson(outPath(pr, "script.json"), ScriptSchema);

    const timing = buildComposition(pr, context, script, captures, cfg);
    log.info(`composition: ${script.scenes.length} scene(s), ${script.risks.length ? "risk card, " : ""}${timing.total}s total → .trailer/${pr}/video/`);

    // Render with HyperFrames (constitution Art. V), streaming its progress line.
    const mp4 = outPath(pr, "trailer.mp4");
    const hf = hyperframes();
    const quality = process.env.TRAILER_QUALITY || "standard";
    let lastPct = -1;
    await run(hf.cmd, [...hf.args, "render", "--quality", quality, "--output", mp4], {
      cwd: outPath(pr, "video"),
      timeoutMs: 300_000,
      onLine: (line) => {
        const m = line.match(/^@hf-progress (.*)$/);
        if (!m) return;
        try {
          const p = JSON.parse(m[1]) as { pct?: number; code?: string };
          const pct = Math.floor((p.pct ?? 0) / 10) * 10;
          if (pct > lastPct) {
            lastPct = pct;
            process.stdout.write(`  ${pc.dim(`rendering ${String(pct).padStart(3)}% · ${p.code ?? ""}`)}\n`);
          }
        } catch {
          // ignore malformed progress lines
        }
      },
    });

    const duration = await probeDuration(mp4);
    if (!(duration >= 20 && duration <= 40)) log.warn(`trailer is ${duration.toFixed(1)}s (target 20–40s)`);

    // GIF preview (GitHub renders GIFs inline) starting at the first before/after scene, plus a poster frame.
    const gif = outPath(pr, "preview.gif");
    await makeGif(mp4, gif, timing.sceneStart, 12, 640);
    if (statSync(gif).size > GIF_MAX_BYTES) await makeGif(mp4, gif, timing.sceneStart, 8, 560);
    await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(timing.sceneStart + 3), "-i", mp4, "-frames:v", "1", outPath(pr, "poster.png")], { echo: false });

    const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    log.info(`trailer.mp4 ${duration.toFixed(1)}s · ${mb(statSync(mp4).size)} · preview.gif ${mb(statSync(gif).size)} · poster.png`);
    return `${duration.toFixed(1)}s trailer`;
  },
};
