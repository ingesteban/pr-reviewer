import { readFileSync, writeFileSync } from "node:fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { Box } from "../../lib/schema.ts";

const CELL = 24; // grid cell size in px
const CELL_THRESHOLD = 0.02; // a cell is "changed" when >2% of its pixels changed
const MAX_BOXES = 5;

/** Copy an image onto a white canvas of the given size (top-left aligned). */
function padTo(img: PNG, width: number, height: number): PNG {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

/** Group changed grid cells into rectangles (4-connected flood fill) and keep the largest. */
export function computeBoxes(diffMask: Uint8Array, width: number, height: number): Box[] {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const changed = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * CELL;
      const y0 = cy * CELL;
      const x1 = Math.min(x0 + CELL, width);
      const y1 = Math.min(y0 + CELL, height);
      let count = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) count += diffMask[y * width + x];
      if (count / ((x1 - x0) * (y1 - y0)) > CELL_THRESHOLD) changed[cy * cols + cx] = 1;
    }
  }

  const seen = new Uint8Array(cols * rows);
  const boxes: Box[] = [];
  for (let start = 0; start < changed.length; start++) {
    if (!changed[start] || seen[start]) continue;
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const cx = i % cols;
      const cy = (i - cx) / cols;
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      const neighbors = [cx > 0 ? i - 1 : -1, cx < cols - 1 ? i + 1 : -1, cy > 0 ? i - cols : -1, cy < rows - 1 ? i + cols : -1];
      for (const n of neighbors) {
        if (n >= 0 && changed[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    const x = minX * CELL;
    const y = minY * CELL;
    boxes.push({ x, y, w: Math.min((maxX + 1) * CELL, width) - x, h: Math.min((maxY + 1) * CELL, height) - y });
  }
  return boxes.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, MAX_BOXES);
}

export interface DiffResult {
  diffRatio: number;
  boxes: Box[];
  width: number;
  height: number;
}

/** Pixel-diff two screenshots, write the diff image, and locate the changed regions. */
export function diffPair(basePath: string, headPath: string, outPath: string): DiffResult {
  const baseRaw = PNG.sync.read(readFileSync(basePath));
  const headRaw = PNG.sync.read(readFileSync(headPath));
  const width = Math.max(baseRaw.width, headRaw.width);
  const height = Math.max(baseRaw.height, headRaw.height);
  const base = padTo(baseRaw, width, height);
  const head = padTo(headRaw, width, height);

  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(base.data, head.data, diff.data, width, height, { threshold: 0.1, alpha: 0.3 });
  writeFileSync(outPath, PNG.sync.write(diff));

  // Mask of changed pixels: pixelmatch paints them in its diff colour (red by default).
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = diff.data[i * 4];
    const g = diff.data[i * 4 + 1];
    const b = diff.data[i * 4 + 2];
    if (r === 255 && g === 0 && b === 0) mask[i] = 1;
  }

  return { diffRatio: changedPixels / (width * height), boxes: computeBoxes(mask, width, height), width, height };
}
