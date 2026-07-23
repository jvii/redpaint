import { LineH } from '../domain/LineH';
import { PaintColor, Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import { GradientShape, MAX_GRADIENT_POLYGON_VERTICES } from '../algorithm/gradientFill';
import { overmind } from '..';

// Draws a filled shape's already-rasterized output when the GPU gradient
// path (drawGradientFilledShape) didn't handle it: solid mode, a degenerate
// (single-color) range, or — the only other case, polygon only — more
// vertices than MAX_GRADIENT_POLYGON_VERTICES. That last case is rare
// enough not to warrant a real per-pixel CPU gradient fallback (that was
// the old bucketPointsByGradient path, deleted along with it): it's simply
// painted flat at rangeLow, same as a degenerate range. Shared by
// PixelBrush and CustomBrush, whose filled-shape methods already reduce to
// the same lines()/quad() calls.
export function drawFilledLines(lines: LineH[], canvas: DrawTarget, solidColor: PaintColor): void {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  canvas.lines(lines, style ? { kind: 'index', colorNumber: style.rangeLow } : solidColor);
}

export function drawFilledQuad(
  start: Point,
  end: Point,
  canvas: DrawTarget,
  solidColor: PaintColor
): void {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  canvas.quad(start, end, style ? { kind: 'index', colorNumber: style.rangeLow } : solidColor);
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
// single-color range, or (polygon only) more vertices than the shader's
// fixed-size loop can hold — see drawFilledLines/drawFilledQuad, the only
// callers of that fallback.
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
