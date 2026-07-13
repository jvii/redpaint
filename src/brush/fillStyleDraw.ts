import { LineH } from '../domain/LineH';
import { PaintColor, Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import { bucketPointsByGradient } from '../algorithm/gradientFill';
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
  // only rasterized into individual points when gradient is active; solid
  // mode keeps the cheap single quad() call above
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
