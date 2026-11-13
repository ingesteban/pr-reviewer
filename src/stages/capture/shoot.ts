import { chromium } from "playwright";
import { ensureDir, outPath } from "../../lib/fs.ts";
import type { Config } from "../../lib/schema.ts";
import type { Side } from "./serve.ts";

/** "/" → "home", "/pricing.html" → "pricing", "/docs/getting-started" → "docs-getting-started". */
export function routeSlug(route: string): string {
  const slug = route
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html?$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return slug || "home";
}

/** Disable animations, transitions and the blinking caret so screenshots are deterministic. */
const FREEZE_CSS = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";

export interface Shot {
  id: string; // "<slug>.<viewport>"
  route: string;
  viewport: "desktop" | "mobile";
  base: string; // relative to .trailer/<pr>/
  head: string;
}

/** Full-page screenshots of every route × viewport on both sides. */
export async function shootAll(pr: number, routes: string[], cfg: Config, urls: Record<Side, string>): Promise<Shot[]> {
  await ensureDir(outPath(pr, "shots"));
  // TRAILER_CHROMIUM lets you point at an already-installed Chrome/Chromium binary.
  const browser = await chromium.launch({ executablePath: process.env.TRAILER_CHROMIUM || undefined });
  const shots: Shot[] = [];
  try {
    for (const route of routes) {
      for (const vp of cfg.viewports) {
        const id = `${routeSlug(route)}.${vp.name}`;
        const rel = (side: Side) => `shots/${id}.${side}.png`;
        for (const side of ["base", "head"] as const) {
          const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
          try {
            await page.goto(`${urls[side]}${route}`, { waitUntil: "networkidle", timeout: 20_000 });
            await page.addStyleTag({ content: FREEZE_CSS });
            await page.evaluate(() => document.fonts.ready);
            await page.screenshot({ path: outPath(pr, rel(side)), fullPage: true });
          } finally {
            await page.close();
          }
        }
        shots.push({ id, route, viewport: vp.name, base: rel("base"), head: rel("head") });
      }
    }
  } finally {
    await browser.close();
  }
  return shots;
}
