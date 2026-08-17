import {
  FontMetrics,
  FontSpec,
  TextRun,
  fontMetrics,
  measureAdvance,
  rasterizeRun,
} from '../algorithm/glyphRaster';
import { bitmapAdvance, bitmapMetrics, bitmapRun, loadedBitmapFont } from './BitmapFont';

// The text tool's view of a font: the line it is typing, and the metrics that
// position the caret around it.
//
// Two kinds of face reach the same TextRun, and everything downstream — the
// tool, the requester's preview — is written against that rather than against
// either one. An outline face is rasterized through canvas and thresholded on
// coverage; a bitmap face is already pixels and is only scaled by whole
// numbers.
export type TextFace =
  | { kind: 'outline'; spec: FontSpec }
  | { kind: 'bitmap'; id: string; scale: number };

function faceKey(face: TextFace): string {
  if (face.kind === 'bitmap') {
    return `b|${face.id}|${face.scale}`;
  }
  const { family, size, bold, italic } = face.spec;
  return `o|${family}|${size}|${bold ? 'b' : ''}|${italic ? 'i' : ''}`;
}

// A bitmap face whose asset has not arrived yet has no metrics and no glyphs.
// Nothing selects one before loadBundledFaces has resolved (the font module
// awaits it), so this is the torn-state guard rather than an expected path.
const MISSING_METRICS: FontMetrics = { lineHeight: 0, ascent: 0, descent: 0 };
const MISSING_RUN: TextRun = {
  width: 0,
  height: 0,
  bits: new Uint8Array(0),
  originX: 0,
  baseline: 0,
};

// Metrics come from a measureText on a scratch canvas — cheap, but asked for on
// every repaint, and they only change when the font does.
const metricsCache = new Map<string, FontMetrics>();

export function metricsOf(face: TextFace): FontMetrics {
  if (face.kind === 'bitmap') {
    const font = loadedBitmapFont(face.id);
    // Not cached: reading a parsed header is cheaper than the map lookup that
    // would guard it, unlike the outline path's measureText.
    return font ? bitmapMetrics(font, face.scale) : MISSING_METRICS;
  }
  const key = faceKey(face);
  const cached = metricsCache.get(key);
  if (cached) {
    return cached;
  }
  const metrics = fontMetrics(face.spec);
  metricsCache.set(key, metrics);
  return metrics;
}

// Only the current line is worth remembering: each keystroke asks for a
// different string, so a map of them would grow forever and never be read
// twice. One entry is enough to keep the caret's twice-a-second blink from
// re-rasterizing text that has not changed.
let lastKey: string | null = null;
let lastRun: TextRun | null = null;

export function textRun(face: TextFace, text: string): TextRun {
  const key = `${faceKey(face)}|${text}`;
  if (key === lastKey && lastRun) {
    return lastRun;
  }
  lastRun = layOut(face, text);
  lastKey = key;
  return lastRun;
}

function layOut(face: TextFace, text: string): TextRun {
  if (face.kind === 'bitmap') {
    const font = loadedBitmapFont(face.id);
    return font ? bitmapRun(font, face.scale, text) : MISSING_RUN;
  }
  return rasterizeRun(face.spec, text);
}

// Where the caret sits, and what the tool measures against the right edge to
// decide a wrap.
export function runAdvance(face: TextFace, text: string): number {
  if (face.kind === 'bitmap') {
    const font = loadedBitmapFont(face.id);
    return font ? bitmapAdvance(font, face.scale, text) : 0;
  }
  return measureAdvance(face.spec, text);
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
