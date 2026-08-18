import {
  FontMetrics,
  FontSpec,
  TextRun,
  fontMetrics,
  measureAdvance,
  rasterizeRun,
} from '../algorithm/glyphRaster';

// The text tool's view of a font: the line it is typing, and the metrics that
// position the caret around it. Everything here is caching around
// algorithm/glyphRaster.ts, which does the actual work.

// Identifies a font for caching. Exported because the text tool caches the
// brush it builds from a run and has to key it on the same thing.
export function faceKey(spec: FontSpec): string {
  return `${spec.family}|${spec.size}|${spec.bold ? 'b' : ''}|${spec.italic ? 'i' : ''}`;
}

// Metrics come from a measureText on a scratch canvas — cheap, but asked for on
// every repaint, and they only change when the font does.
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

// Only the current line is worth remembering: each keystroke asks for a
// different string, so a map of them would grow forever and never be read
// twice. One entry is enough to keep the caret's twice-a-second blink from
// re-rasterizing text that has not changed.
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

// Where the caret sits, and what the tool measures against the right edge to
// decide a wrap.
export function runAdvance(spec: FontSpec, text: string, tracking = 0): number {
  return measureAdvance(spec, text, tracking);
}

// The room the outline style needs between one letter's ink and the next:
// outlineRun grows a glyph by a pixel on every side, so two pixels — one for
// each of the two rings that meet in a gap — keeps them from touching. A
// constant, not a fraction of the size: the ring is one pixel thick at every
// size.
export const OUTLINE_ROOM = 2;

// The distance from one line's baseline to the next: the font's line box, the
// room for the two rings, and one row more.
//
// The extra row is what the horizontal direction gets for free. Letters carry
// side bearings, so there is already a column of background between them to
// spend on the rings; lines carry no such guarantee, and a face can set its
// line box to exactly its ink height — Press Start 2P does, at every size — so
// without it the rings of stacked lines meet along a continuous band.
//
// Added whichever style is selected, unlike the horizontal tracking. Line
// spacing that changed with the style would reflow a paragraph typed half in
// each, and switching halves would move lines already on the canvas.
export function lineAdvance(spec: FontSpec): number {
  return metricsOf(spec).lineHeight + OUTLINE_ROOM + 1;
}

// A rule under the line, DPaint's Font menu "Underline". Applied to the run
// rather than asked of canvas, which has no text-decoration of any kind.
//
// Where and how thick is ours to choose: a font's underline position and
// thickness live in its `post` table and measureText surfaces neither. Both
// scale with the size instead of being a constant hairline — against Press
// Start 2P at 24px, whose strokes are 3px, a single pixel reads as a rendering
// fault rather than as a rule.
//
// The run grows to fit it. It is sized to the ink, so the rule falls below the
// descent of text that has none, and it spans the whole advance, which is wider
// than the ink whenever the line ends in a space.
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

// The run's outline: every pixel orthogonally or diagonally touching the text
// but not part of it. DPaint's Font menu "Outline" style, which is what the
// text gadget's upper half selects.
//
// The run grows by a pixel on every side to make room for it, so an outline is
// never clipped by the bitmap that was sized for the text alone.
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
