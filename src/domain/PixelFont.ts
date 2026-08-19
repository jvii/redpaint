import {
  FontMetrics,
  FontSpec,
  TextRun,
  fontMetrics,
  rasterizeRun,
} from '../algorithm/glyphRaster';

// Re-exported so the tool has one import site for its view of a font; there is
// nothing to add to it.
export { measureAdvance } from '../algorithm/glyphRaster';

// Caching around algorithm/glyphRaster.ts, plus the underline and outline
// passes. See docs/text-tool.md.

// Exported because the text tool keys its brush cache on the same thing.
export function faceKey(spec: FontSpec): string {
  return `${spec.family}|${spec.size}|${spec.bold ? 'b' : ''}|${spec.italic ? 'i' : ''}`;
}

// Asked for on every repaint; only change when the font does.
const metricsCache = new Map<string, FontMetrics>();

export function metricsOf(spec: FontSpec): FontMetrics {
  const key = faceKey(spec);
  const cached = metricsCache.get(key);
  if (cached) {
    return cached;
  }
  const metrics = fontMetrics(spec);
  metricsCache.set(key, metrics);
  return metrics;
}

// One entry: each keystroke asks for a different string, so a map would grow
// forever. Enough to keep the caret's blink from re-rasterizing.
let lastKey: string | null = null;
let lastRun: TextRun | null = null;

export function textRun(spec: FontSpec, text: string, tracking = 0): TextRun {
  const key = `${faceKey(spec)}|${tracking}|${text}`;
  if (key === lastKey && lastRun) {
    return lastRun;
  }
  lastRun = rasterizeRun(spec, text, tracking);
  lastKey = key;
  return lastRun;
}

// Two pixels, one for each of the rings that meet in a gap. A constant: the
// ring is one pixel thick at every size.
export const OUTLINE_ROOM = 2;

// The line box, room for the two rings, and one row more that the horizontal
// direction gets free from side bearings. Added whichever style is selected —
// spacing that changed with it would reflow a paragraph typed half in each.
export function lineAdvance(spec: FontSpec): number {
  return metricsOf(spec).lineHeight + OUTLINE_ROOM + 1;
}

// DPaint's Font menu "Underline". Canvas has no text-decoration, and
// measureText surfaces neither the position nor the thickness a font declares,
// so both are chosen here and scale with the size. The run grows to fit.
export function underlineRun(run: TextRun, advance: number, size: number): TextRun {
  if (run.width === 0 || run.height === 0) {
    return run;
  }
  const thickness = Math.max(1, Math.round(size / 16));
  const gap = Math.max(1, Math.round(size / 16));
  const top = run.baseline + gap;

  const width = Math.max(run.width, run.originX + advance);
  const height = Math.max(run.height, top + thickness);
  const bits = new Uint8Array(width * height);
  for (let y = 0; y < run.height; y++) {
    bits.set(run.bits.subarray(y * run.width, (y + 1) * run.width), y * width);
  }
  for (let y = top; y < top + thickness; y++) {
    bits.fill(1, y * width + run.originX, y * width + run.originX + advance);
  }
  return { ...run, width, height, bits };
}

// Every pixel touching the text but not part of it. The run grows by a pixel
// on every side so the ring is never clipped.
export function outlineRun(run: TextRun): TextRun {
  if (run.width === 0 || run.height === 0) {
    return run;
  }
  const width = run.width + 2;
  const height = run.height + 2;
  const bits = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // -1 converts a position in the grown bitmap to one in the source run
      if (inkAt(run, x - 1, y - 1) || !touchesInk(run, x - 1, y - 1)) {
        continue;
      }
      bits[y * width + x] = 1;
    }
  }

  return {
    width,
    height,
    bits,
    originX: run.originX + 1,
    baseline: run.baseline + 1,
  };
}

function inkAt(run: TextRun, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= run.width || y >= run.height) {
    return false;
  }
  return run.bits[y * run.width + x] === 1;
}

function touchesInk(run: TextRun, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inkAt(run, x + dx, y + dy)) {
        return true;
      }
    }
  }
  return false;
}
