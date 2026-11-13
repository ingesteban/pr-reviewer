import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { outPath, repoRoot } from "../../lib/fs.ts";
import { cropAround, cropResize, loadPadded, mapBoxes, writePng } from "../../lib/image.ts";
import type { Box, Capture, Config, Context, Script } from "../../lib/schema.ts";

export const WIDTH = 1280;
export const HEIGHT = 720;
const PANEL = { w: 576, h: 420 };
const PHONE = { w: 284, h: 404 }; // mobile scenes: phone-shaped frames cropped to the real screen width
const RISK_PANEL = { w: 580, h: 500 };
const T_TITLE = 3;
const T_SUMMARY = 3;
const T_RISK = 4;
const T_OUTRO = 3;

export interface Timing {
  sceneStart: number; // when the first before/after scene starts (used for the GIF/poster)
  sceneDuration: number;
  total: number;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const repoName = (url: string): string => url.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] ?? "";

const routeLabel = (route: string): string => (route === "/" ? "Home" : route.replace(/^\//, "").replace(/\.html?$/, ""));

export function sceneDurationFor(n: number): number {
  return Math.min(6, Math.max(4, Math.round((18 / n) * 10) / 10));
}

interface PreparedScene {
  id: string;
  capture: Capture;
  caption: string;
  detail: string;
  boxes: Box[];
  focusIndex: number;
  phone: boolean;
  start: number;
  duration: number;
}

/**
 * Turn script.json + captures into a self-contained HyperFrames project in .trailer/<pr>/video/:
 * index.html (one composition, timed clips + one paused GSAP timeline), cropped PNGs and a local GSAP copy.
 */
export function buildComposition(pr: number, context: Context, script: Script, captures: Capture[], cfg: Config): Timing {
  const dir = outPath(pr, "video");
  rmSync(dir, { recursive: true, force: true });
  const assets = join(dir, "assets");
  mkdirSync(assets, { recursive: true });

  const byId = new Map(captures.map((c) => [c.id, c]));
  const scenesIn = script.scenes.filter((s) => byId.has(s.captureId));
  const d = sceneDurationFor(Math.max(1, scenesIn.length));
  const sceneStart = T_TITLE + T_SUMMARY;

  // 1. Cropped before/after images per scene, centred on the focus box.
  const scenes: PreparedScene[] = scenesIn.map((s, i) => {
    const capture = byId.get(s.captureId)!;
    const focus = capture.boxes[s.focusBox] ?? capture.boxes[0];
    // Mobile: crop to the real screen width (what a phone shows); desktop: the whole page width.
    const viewportWidth = cfg.viewports.find((v) => v.name === capture.viewport)?.width ?? capture.width;
    const phone = capture.viewport === "mobile";
    const panel = phone ? PHONE : PANEL;
    const crop = phone
      ? { ...cropAround(Math.min(viewportWidth, capture.width), capture.height, panel.w / panel.h, focus), x: 0 }
      : cropAround(capture.width, capture.height, panel.w / panel.h, focus);
    const scale = panel.w / crop.w;
    for (const side of ["base", "head"] as const) {
      const img = loadPadded(outPath(pr, capture[side]), capture.width, capture.height);
      writePng(join(assets, `s${i}-${side}.png`), cropResize(img, crop, panel.w, panel.h));
    }
    const boxes = mapBoxes(capture.boxes, crop, scale, panel.w, panel.h).slice(0, 4);
    const focusMapped = focus ? mapBoxes([focus], crop, scale, panel.w, panel.h)[0] : undefined;
    const focusIndex = focusMapped ? boxes.findIndex((b) => b.x === focusMapped.x && b.y === focusMapped.y) : -1;
    return { id: `s${i}`, capture, caption: s.caption, detail: s.detail, boxes, focusIndex, phone, start: sceneStart + i * d, duration: d };
  });

  // 2. Risk card image (first risk), zoomed on its capture's focus box.
  const risk = script.risks[0];
  let riskBox: Box | undefined;
  if (risk && byId.has(risk.captureId)) {
    const capture = byId.get(risk.captureId)!;
    const sceneForRisk = scenesIn.find((s) => s.captureId === risk.captureId);
    const focus = capture.boxes[sceneForRisk?.focusBox ?? 0] ?? capture.boxes[0];
    const crop = cropAround(capture.width, capture.height, RISK_PANEL.w / RISK_PANEL.h, focus);
    const img = loadPadded(outPath(pr, capture.head), capture.width, capture.height);
    writePng(join(assets, "risk.png"), cropResize(img, crop, RISK_PANEL.w, RISK_PANEL.h));
    riskBox = focus ? mapBoxes([focus], crop, RISK_PANEL.w / crop.w, RISK_PANEL.w, RISK_PANEL.h)[0] : undefined;
  }
  const hasRisk = Boolean(risk && byId.has(risk.captureId));

  const riskStart = sceneStart + scenes.length * d;
  const outroStart = riskStart + (hasRisk ? T_RISK : 0);
  const total = Math.round((outroStart + T_OUTRO) * 10) / 10;

  // 3. Local GSAP (no network at render time) + the trailer stylesheet.
  const require = createRequire(import.meta.url);
  copyFileSync(require.resolve("gsap/dist/gsap.min.js"), join(assets, "gsap.min.js"));
  const css = readFileSync(resolve(repoRoot(), "templates/trailer/trailer.css"), "utf8");

  writeFileSync(join(dir, "index.html"), renderHtml({ pr, context, script, scenes, hasRisk, riskBox, riskStart, outroStart, total, css }));
  return { sceneStart, sceneDuration: d, total };
}

interface HtmlInput {
  pr: number;
  context: Context;
  script: Script;
  scenes: PreparedScene[];
  hasRisk: boolean;
  riskBox?: Box;
  riskStart: number;
  outroStart: number;
  total: number;
  css: string;
}

const boxHtml = (b: Box, id: string, focus: boolean): string =>
  `<div id="${id}" class="box${focus ? " focus" : ""}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>`;

function renderHtml(h: HtmlInput): string {
  const { context, script, scenes, total } = h;
  const good = script.verdict === "looks-good";
  const changedScreens = new Set(scenes.map((s) => s.capture.route)).size;
  const repo = repoName(context.pr.url);
  const clips: string[] = [];
  const tl: string[] = [];
  const at = (n: number) => n.toFixed(2);

  // Title
  clips.push(`
    <div id="title" class="scene clip" data-start="0" data-duration="${T_TITLE}" data-track-index="1">
      <div id="title-bar" class="title-bar"></div>
      <div class="title-wrap">
        <div id="title-kicker" class="kicker">🎬 PR Trailer${repo ? ` · ${esc(repo)}` : ""}</div>
        <h1 id="title-h1">${esc(script.title)}</h1>
        <div id="title-meta" class="meta">PR <b>#${context.pr.number}</b> · <b>@${esc(context.pr.author)}</b> · ${esc(context.pr.head)} → ${esc(context.pr.base)}</div>
      </div>
    </div>`);
  tl.push(`tl.fromTo("#title-bar", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, 0.15);`);
  tl.push(`tl.fromTo("#title-kicker", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.25);`);
  tl.push(`tl.fromTo("#title-h1", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.4);`);
  tl.push(`tl.fromTo("#title-meta", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.75);`);

  // Summary
  const s0 = T_TITLE;
  clips.push(`
    <div id="summary" class="scene clip" data-start="${s0}" data-duration="${T_SUMMARY}" data-track-index="1">
      <div class="summary-wrap">
        <div id="summary-kicker" class="kicker">What changed</div>
        <p id="summary-text">${esc(script.summary)}</p>
        <div id="summary-chips" class="chips">
          <span class="chip ${good ? "good" : "warn"}">${good ? "✓ Looks good" : "⚠ Needs a look"}</span>
          <span class="chip">${changedScreens} screen${changedScreens === 1 ? "" : "s"} changed</span>
          <span class="chip">${script.risks.length} risk${script.risks.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>`);
  tl.push(`tl.fromTo("#summary-kicker", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, ${at(s0 + 0.1)});`);
  tl.push(`tl.fromTo("#summary-text", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, ${at(s0 + 0.25)});`);
  tl.push(`tl.fromTo("#summary-chips", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${at(s0 + 0.8)});`);

  // Before / after scenes
  scenes.forEach((sc, i) => {
    const v = sc.capture.viewport === "mobile" ? "📱 Mobile" : "🖥 Desktop";
    const boxes = sc.boxes.map((b, j) => boxHtml(b, `${sc.id}-box${j}`, j === sc.focusIndex)).join("");
    clips.push(`
    <div id="${sc.id}" class="scene clip" data-start="${at(sc.start)}" data-duration="${at(sc.duration)}" data-track-index="1">
      <div id="${sc.id}-head" class="scene-head">
        <span class="chip">${v}</span><span class="route">${esc(routeLabel(sc.capture.route))}</span>
        <span class="count">SCENE ${i + 1}/${scenes.length}</span>
      </div>
      <div id="${sc.id}-before" class="panel before${sc.phone ? " phone" : ""}"><img src="assets/${sc.id}-base.png" alt="" /><span class="label">BEFORE</span></div>
      <div id="${sc.id}-after" class="panel after${sc.phone ? " phone" : ""}"><img src="assets/${sc.id}-head.png" alt="" />${boxes}<div id="${sc.id}-cover" class="cover"></div><span class="label">AFTER</span></div>
      <div id="${sc.id}-lower" class="lower">
        <div class="caption">${esc(sc.caption)}</div>
        <div class="detail">${esc(sc.detail)}</div>
      </div>
    </div>`);
    const t = sc.start;
    tl.push(`tl.fromTo("#${sc.id}-head", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.4 }, ${at(t + 0.05)});`);
    tl.push(`tl.fromTo("#${sc.id}-before", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${at(t + 0.1)});`);
    tl.push(`tl.fromTo("#${sc.id}-after", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${at(t + 0.2)});`);
    tl.push(`tl.fromTo("#${sc.id}-cover", { scaleX: 1 }, { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, ${at(t + 0.75)});`);
    tl.push(`tl.fromTo("#${sc.id}-lower", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${at(t + 1.0)});`);
    sc.boxes.forEach((_, j) => {
      tl.push(`tl.fromTo("#${sc.id}-box${j}", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${at(t + 1.5 + j * 0.15)});`);
    });
  });

  // Risk
  if (h.hasRisk) {
    const risk = script.risks[0];
    const rs = h.riskStart;
    const sev = risk.severity === "high" ? "High risk" : risk.severity === "medium" ? "Medium risk" : "Low risk";
    const more = script.risks.length > 1 ? `<div class="more">+ ${script.risks.length - 1} more risk${script.risks.length > 2 ? "s" : ""} in the PR comment</div>` : "";
    clips.push(`
    <div id="risk" class="scene clip" data-start="${at(rs)}" data-duration="${T_RISK}" data-track-index="1">
      <div class="risk-glow"></div>
      <div id="risk-text" class="risk-text">
        <div class="kicker">⚠ ${sev} · ${esc(risk.captureId.replace(".", " · "))}</div>
        <h2>Needs a look</h2>
        <p>${esc(risk.description)}</p>${more}
      </div>
      <div id="risk-panel" class="risk-panel"><div id="risk-zoom" class="zoom"><img src="assets/risk.png" alt="" />${h.riskBox ? boxHtml(h.riskBox, "risk-box", false) : ""}</div></div>
    </div>`);
    tl.push(`tl.fromTo("#risk-text", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${at(rs + 0.1)});`);
    tl.push(`tl.fromTo("#risk-panel", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, ${at(rs + 0.2)});`);
    tl.push(`tl.fromTo("#risk-zoom", { scale: 1 }, { scale: 1.12, duration: ${at(T_RISK - 0.6)}, ease: "none" }, ${at(rs + 0.5)});`);
    if (h.riskBox) tl.push(`tl.fromTo("#risk-box", { opacity: 0 }, { opacity: 1, duration: 0.3, repeat: 3, yoyo: true }, ${at(rs + 0.8)});`);
  }

  // Outro
  const os = h.outroStart;
  clips.push(`
    <div id="outro" class="scene clip" data-start="${at(os)}" data-duration="${T_OUTRO}" data-track-index="1">
      <div class="outro-wrap">
        <div id="outro-verdict" class="verdict ${good ? "good" : "warn"}">${good ? "✓ Looks good to merge" : "⚠ Needs a look before merging"}</div>
        <div id="outro-brand" class="brand">🎬 Made with <span>PR Trailers</span></div>
        <div id="outro-credits" class="credits">Narrated by ${esc(script.model ?? "a template")} · Rendered with HyperFrames</div>
      </div>
    </div>`);
  tl.push(`tl.fromTo("#outro-verdict", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${at(os + 0.1)});`);
  tl.push(`tl.fromTo("#outro-brand", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45 }, ${at(os + 0.6)});`);
  tl.push(`tl.fromTo("#outro-credits", { opacity: 0 }, { opacity: 1, duration: 0.45 }, ${at(os + 0.9)});`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${WIDTH}, height=${HEIGHT}" />
    <title>PR #${context.pr.number} trailer</title>
    <script src="assets/gsap.min.js"></script>
    <style>
${h.css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${WIDTH}" data-height="${HEIGHT}">${clips.join("")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tl.join("\n      ")}
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}
