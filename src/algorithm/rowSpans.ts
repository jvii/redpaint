// A local (shape-center-relative) row -> [minX, maxX] lookup table for a filled
// circle/ellipse, derived from the exact same rasterizer solid fill uses
// (filledCircle/filledEllipse, shape.ts) rather than a separate continuous
// approximation of the shape's boundary. This is what lets the GPU gradient
// fill (src/canvas/util/rowSpanTexture.ts uploads this as a texture) match the
// CPU-filled shape pixel-for-pixel: it looks up each fragment's row in this
// table instead of testing it against an ellipse equation that rounds
// differently than the CPU rasterizer does.
//
// filledCircle/filledEllipse already return one segment per row (LineH) or per
// column (LineV), not one entry per pixel. O(radius), not O(area), so building
// this table costs the same as the seed/hash setup the gradient fill already
// does once per stroke, regardless of the shape's pixel count. A LineV (ellipse
// only, a column filled top-to-bottom) only extends its own two endpoint rows
// here rather than every row it spans: every row already gets its own exact
// span from the row loop (xGivenY, closed-form, always complete), so a column
// can only ever matter at its boundary, where its own rounding might reach
// slightly further than that row's own rounding did. Touching every row a tall
// column spans would cost O(shape area) again; touching just its two ends keeps
// this at O(radius).
import { Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import { filledCircle, filledEllipse } from './shape';

export type RowSpanTable = {
  yMin: number;
  // spans[i] is the row at canvas-local y = yMin + i
  spans: { min: number; max: number }[];
};

const ORIGIN: Point = { x: 0, y: 0 };

// Exported for callers with their own local (center-relative) LineH/LineV
// shape: e.g. the Fill Style preview swatch (FillStyleSettings.tsx), which
// deliberately draws a *different* ellipse rasterization than filledEllipse's
// for its own reasons (see symmetricFilledEllipse's own comment) but still
// wants the Gradient/Pattern preview to use that same footprint rather than the
// real filledEllipse-derived one, so all three fill-mode previews in that
// swatch agree with each other.
export function rowSpansFromLines(lines: (LineH | LineV)[]): RowSpanTable {
  const rows = new Map<number, { min: number; max: number }>();
  const extend = (y: number, x: number): void => {
    const span = rows.get(y);
    if (!span) {
      rows.set(y, { min: x, max: x });
    } else if (x < span.min) {
      span.min = x;
    } else if (x > span.max) {
      span.max = x;
    }
  };
  for (const line of lines) {
    if (line instanceof LineH) {
      extend(line.p1.y, line.p1.x);
      extend(line.p1.y, line.p2.x);
    } else {
      extend(line.p1.y, line.p1.x);
      extend(line.p2.y, line.p2.x);
    }
  }

  const ys = [...rows.keys()];
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const spans: { min: number; max: number }[] = [];
  for (let y = yMin; y <= yMax; y++) {
    // every row in [yMin, yMax] is produced by the shape's own row loop
    // (xGivenY inside filledEllipse, or the Bresenham loop inside
    // filledCircle). This fallback should be unreachable, kept only so a
    // malformed table fails safe (empty span) rather than looking up undefined.
    spans.push(rows.get(y) ?? { min: 0, max: -1 });
  }
  return { yMin, spans };
}

export function circleRowSpans(radius: number): RowSpanTable {
  return rowSpansFromLines(filledCircle(ORIGIN, radius));
}

export function ellipseRowSpans(
  radiusX: number,
  radiusY: number,
  rotationAngle: number
): RowSpanTable {
  return rowSpansFromLines(filledEllipse(ORIGIN, radiusX, radiusY, rotationAngle));
}
