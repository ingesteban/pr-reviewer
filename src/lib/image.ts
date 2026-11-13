import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { Box } from "./schema.ts";

/** Load a PNG onto a white canvas of the given size (top-left aligned), so base and head line up. */
export function loadPadded(path: string, width: number, height: number): PNG {
  const img = PNG.sync.read(readFileSync(path));
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, width), Math.min(img.height, height), 0, 0);
  return out;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crop a rectangle and resize it to outW × outH with box-filter averaging (good for downscaling). */
export function cropResize(src: PNG, r: Rect, outW: number, outH: number): PNG {
  const out = new PNG({ width: outW, height: outH });
  const sx = r.w / outW;
  const sy = r.h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const y0 = Math.floor(r.y + oy * sy);
    const y1 = Math.max(y0 + 1, Math.min(src.height, Math.floor(r.y + (oy + 1) * sy)));
    for (let ox = 0; ox < outW; ox++) {
      const x0 = Math.floor(r.x + ox * sx);
      const x1 = Math.max(x0 + 1, Math.min(src.width, Math.floor(r.x + (ox + 1) * sx)));
      let red = 0, green = 0, blue = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * src.width + x) * 4;
          red += src.data[i]; green += src.data[i + 1]; blue += src.data[i + 2]; n++;
        }
      }
      const o = (oy * outW + ox) * 4;
      out.data[o] = red / n; out.data[o + 1] = green / n; out.data[o + 2] = blue / n; out.data[o + 3] = 255;
    }
  }
  return out;
}

export function writePng(path: string, png: PNG): void {
  writeFileSync(path, PNG.sync.write(png));
}

/**
 * Pick a crop of the given aspect ratio that keeps the full image width when possible and is
 * vertically centred on `focus` (clamped to the image).
 */
export function cropAround(imgW: number, imgH: number, aspect: number, focus?: Box): Rect {
  let w = imgW;
  let h = Math.round(w / aspect);
  if (h > imgH) {
    h = imgH;
    w = Math.min(imgW, Math.round(h * aspect));
  }
  const cx = focus ? focus.x + focus.w / 2 : imgW / 2;
  const cy = focus ? focus.y + focus.h / 2 : h / 2;
  const x = Math.max(0, Math.min(imgW - w, Math.round(cx - w / 2)));
  const y = Math.max(0, Math.min(imgH - h, Math.round(cy - h / 2)));
  return { x, y, w, h };
}

/** Map boxes from image space into a crop that was resized by `scale`; drop boxes outside it. */
export function mapBoxes(boxes: Box[], crop: Rect, scale: number, outW: number, outH: number): Box[] {
  return boxes
    .map((b) => {
      const x0 = Math.max(0, (b.x - crop.x) * scale);
      const y0 = Math.max(0, (b.y - crop.y) * scale);
      const x1 = Math.min(outW, (b.x + b.w - crop.x) * scale);
      const y1 = Math.min(outH, (b.y + b.h - crop.y) * scale);
      return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
    })
    .filter((b) => b.w > 8 && b.h > 8);
}
