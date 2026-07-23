import { LineH } from '../domain/LineH';
import { PaintColor, Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import {
  bucketPointsByGradient,
  GradientShape,
  MAX_GRADIENT_POLYGON_VERTICES,
} from '../algorithm/gradientFill';
import { overmind } from '..';

// Draws a filled shape's already-rasterized output with the current fill
// style. Solid mode (the default, and every fill before this feature
// existed) paints with the given color via a single lines()/quad() call, as
// today. Gradient mode expands the output into points, buckets them by
// target color (see bucketPointsByGradient), and issues one points() call
// per bucket instead — every call this makes is still an ordinary
// single-color batch, so no changes are needed to DrawTarget,
// CanvasController, or the WebGL layer below it. Shared by PixelBrush and
// CustomBrush, whose filled-shape methods already reduce to the same
// lines()/quad() calls.
export function drawFilledLines(lines: LineH[], canvas: DrawTarget, solidColor: PaintColor): void {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  if (!style) {
    canvas.lines(lines, solidColor);
    return;
  }
  // a degenerate (single-color) range always resolves to rangeLow (see
  // bucketPointsByGradient) — skip rasterizing to points and bucketing
  // through a Map for a case that only ever produces one bucket
  if (style.rangeHigh - style.rangeLow <= 0) {
    canvas.lines(lines, { kind: 'index', colorNumber: style.rangeLow });
    return;
  }
  const points = lines.flatMap((line) => line.asPoints());
  for (const [colorNumber, bucketPoints] of bucketPointsByGradient(points, style)) {
    canvas.points(bucketPoints, { kind: 'index', colorNumber });
  }
}

export function drawFilledQuad(
  start: Point,
  end: Point,
  canvas: DrawTarget,
  solidColor: PaintColor
): void {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  if (!style) {
    canvas.quad(start, end, solidColor);
    return;
  }
  if (style.rangeHigh - style.rangeLow <= 0) {
    canvas.quad(start, end, { kind: 'index', colorNumber: style.rangeLow });
    return;
  }
  // only rasterized into individual points when gradient is active with a
  // real (non-degenerate) range; solid mode and a degenerate range both
  // keep the cheap single quad() call above
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const points: Point[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y });
    }
  }
  for (const [colorNumber, bucketPoints] of bucketPointsByGradient(points, style)) {
    canvas.points(bucketPoints, { kind: 'index', colorNumber });
  }
}

// The per-stroke dither seed for GPU gradient fills. One value covers a
// whole stroke: every symmetry copy and every preview redraw of the same
// drag reads the same seed (identical speckle), and setUndoPoint re-rolls
// it when the stroke commits (fresh speckle for the next fill). See
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md, "Seed lifecycle".
// Kept small (not e.g. *1000): gradientHash adds this straight onto a
// shape-local pixel position before its own fract(), so a large seed
// reintroduces the same mediump-precision blowup the hash's fract-early
// design is built to avoid.
let gradientSeed = Math.random() * 8;

export function newGradientSeed(): void {
  gradientSeed = Math.random() * 8;
}

// Routes a convex filled shape through the GPU gradient path. Returns false
// when the caller should use its CPU path instead: solid mode, a
// single-color range (drawFilledLines/drawFilledQuad short-circuit that
// case to a single rangeLow-colored lines()/quad() call, same as solid
// mode) — or (polygon only) more vertices than the shader's fixed-size
// loop can hold.
export function drawGradientFilledShape(shape: GradientShape, canvas: DrawTarget): boolean {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  if (!style || style.rangeHigh - style.rangeLow <= 0) {
    return false;
  }
  if (shape.kind === 'polygon' && shape.vertices.length > MAX_GRADIENT_POLYGON_VERTICES) {
    return false;
  }
  canvas.gradientFill(shape, style, gradientSeed);
  return true;
}
