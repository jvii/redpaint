import { LineH } from '../domain/LineH';
import { PaintColor, Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import { FillShape, MAX_FILL_POLYGON_VERTICES } from '../algorithm/fillShape';
import { overmind } from '..';
import { patternFillStore } from './PatternFill';

// Draws a filled shape's already-rasterized output when no GPU fill path
// handled it (see drawStyledFilledShape): solid mode, a degenerate
// (single-color) gradient range, Pattern mode with nothing captured, or —
// the only other case, polygon only — more vertices than
// MAX_FILL_POLYGON_VERTICES. That last case is rare enough not to warrant a
// real per-pixel CPU gradient fallback (that was the old
// bucketPointsByGradient path, deleted along with it): it's simply painted
// flat at rangeLow, same as a degenerate range.
function drawFilledLines(lines: LineH[], canvas: DrawTarget, solidColor: PaintColor): void {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  canvas.lines(lines, style ? { kind: 'index', colorNumber: style.rangeLow } : solidColor);
}

function drawFilledQuad(
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

// The one entry point every filled-shape method goes through — the whole
// Fill Style decision, in mode priority order: Pattern (if Pattern mode has
// a captured pattern), then Gradient (if Gradient mode resolves to a usable
// multi-color range), then the caller's own CPU rasterization painted flat.
// Modes are mutually exclusive, so at most one GPU path can claim a shape.
//
// `rasterize` is a callback, not a pre-computed LineH[]: the CPU
// rasterization is pure waste whenever a GPU path claims the shape, and for
// a large filled ellipse it's the expensive part. Callers hand over the
// shape description and a way to rasterize it, and never see which path ran.
// A rect needs no callback — its fallback is a single quad(), no
// rasterization at all — and the overloads below make that the type
// signature rather than a convention: rect takes no third argument, every
// other shape requires one.
export function drawStyledFilledShape(
  shape: Extract<FillShape, { kind: 'rect' }>,
  canvas: DrawTarget
): void;
export function drawStyledFilledShape(
  shape: Exclude<FillShape, { kind: 'rect' }>,
  canvas: DrawTarget,
  rasterize: () => LineH[]
): void;
export function drawStyledFilledShape(
  shape: FillShape,
  canvas: DrawTarget,
  rasterize?: () => LineH[]
): void {
  // A polygon past the shader's fixed-size loop can't take either GPU path
  // (see MAX_FILL_POLYGON_VERTICES) — checked once here rather than in both.
  const gpuCapable = shape.kind !== 'polygon' || shape.vertices.length <= MAX_FILL_POLYGON_VERTICES;

  if (gpuCapable) {
    const { effectiveMode, effectiveFillStyle } = overmind.state.fillStyle;
    const pattern = patternFillStore.pattern;
    if (effectiveMode === 'pattern' && pattern) {
      canvas.patternFill(shape, pattern.brushColorIndex, patternFillStore.version);
      return;
    }
    if (effectiveMode === 'gradient' && effectiveFillStyle) {
      canvas.gradientFill(shape, effectiveFillStyle, gradientSeed);
      return;
    }
  }

  const solidColor = overmind.state.tool.activePaintColor;
  if (shape.kind === 'rect') {
    drawFilledQuad(shape.start, shape.end, canvas, solidColor);
    return;
  }
  drawFilledLines(rasterize(), canvas, solidColor);
}
