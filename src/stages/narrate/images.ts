import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { outPath } from "../../lib/fs.ts";
import type { Box, Capture } from "../../lib/schema.ts";

const TARGET_WIDTH = 800;
const MAX_HEIGHT = 2400; // after scaling

export interface PreparedImages {
  base: string; // base64 PNG
  head: string;
  boxes: Box[]; // in the prepared images' coordinates
  width: number;
  height: number;
}

/** Load a screenshot onto a white canvas of the capture's compared size, so base and head align. */
function loadPadded(path: string, width: number, height: number): PNG {
  const img = PNG.sync.read(readFileSync(path));
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, width), Math.min(img.height, height), 0, 0);
  return out;
}

/** Crop rows [y0, y0 + h) and downscale by `scale` with box averaging. */
function cropAndScale(src: PNG, y0: number, h: number, scale: number): PNG {
  const outW = Math.max(1, Math.round(src.width * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const out = new PNG({ width: outW, height: outH });
  const step = 1 / scale;
  for (let oy = 0; oy < outH; oy++) {
    const sy0 = y0 + Math.floor(oy * step);
    const sy1 = Math.min(y0 + h, Math.max(sy0 + 1, y0 + Math.floor((oy + 1) * step)));
    for (let ox = 0; ox < outW; ox++) {
      const sx0 = Math.floor(ox * step);
      const sx1 = Math.min(src.width, Math.max(sx0 + 1, Math.floor((ox + 1) * step)));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * src.width + sx) * 4;
          r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++;
        }
      }
      const o = (oy * outW + ox) * 4;
      out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n; out.data[o + 3] = 255;
    }
  }
  return out;
}

/** Downscale to ≤ 800 px wide and crop to ≤ 2400 px tall around the changed regions. */
export function prepareImages(pr: number, capture: Capture): PreparedImages {
  const { width, height, boxes } = capture;
  const scale = Math.min(1, TARGET_WIDTH / width);
  const cropH = Math.min(height, Math.floor(MAX_HEIGHT / scale));

  // Center the crop on the union of the boxes.
  let y0 = 0;
  if (cropH < height && boxes.length) {
    const top = Math.min(...boxes.map((b) => b.y));
    const bottom = Math.max(...boxes.map((b) => b.y + b.h));
    y0 = Math.round((top + bottom) / 2 - cropH / 2);
    y0 = Math.max(0, Math.min(height - cropH, y0));
  }

  const encode = (path: string) =>
    PNG.sync.write(cropAndScale(loadPadded(outPath(pr, path), width, height), y0, cropH, scale)).toString("base64");

  const scaled = boxes
    .map((b) => ({
      x: Math.round(b.x * scale),
      y: Math.round((b.y - y0) * scale),
      w: Math.max(1, Math.round(b.w * scale)),
      h: Math.max(1, Math.round(b.h * scale)),
    }))
    .filter((b) => b.y + b.h > 0 && b.y < cropH * scale)
    .map((b) => ({ ...b, y: Math.max(0, b.y) }));

  return {
    base: encode(capture.base),
    head: encode(capture.head),
    boxes: scaled,
    width: Math.round(width * scale),
    height: Math.round(cropH * scale),
  };
}
