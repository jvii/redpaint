import { Point } from '../types';

// DPaint II's gradient fill: a spatial axis mapped onto a palette range's
// contiguous color band. See docs/true-color-mode.md and the Fill Style
// requester (src/components/fillStyle/) for the user-facing picture. The
// binning and dither math below follow PyDPainter's Random dither mode
// (libs/prim.py) rather than an invented scheme — its result is genuinely
// random per pixel (not an ordered/repeating pattern), confirmed against
// real DPaint II output.
export type GradientAxis = 'vertical' | 'horizontal' | 'horizontalLine';

export type GradientFillStyle = {
  axis: GradientAxis;
  rangeLow: number; // 1-based color id, inclusive — same units as PaintColor.colorNumber
  rangeHigh: number; // 1-based color id, inclusive
  dither: number; // 0..20, 0 = off — PyDPainter's Random dither scale
  // Divides dither into a jitter half-width, in units of a band's own width
  // (half-width = dither/(2*ditherDivisor) of a band). 4 (the default when
  // omitted) matches PyDPainter's fixed-point dither exactly — see
  // colorIdForPosition. Exposed as a parameter, rather than only the fixed
  // constant, so the Fill Style requester can offer it as an experimental
  // tuning slider without the algorithm needing to know about the UI.
  ditherDivisor?: number;
};

const DEFAULT_DITHER_DIVISOR = 4;

// The color id for one pixel at `pos` along an axis spanning [min, min+span)
// over bandCount+1 colors. Each color owns a "pointsPerColor"-wide band of
// raw positions (floor-divided, not rounded — matching the reference); with
// dither > 0, pos is jittered first by up to +/-(dither/ditherDivisor *
// pointsPerColor) pixels — the jitter range grows with the band width
// itself, which is why high dither can blend a pixel several bands away,
// not just its immediate neighbor. ditherDivisor=4 (the default) makes the
// half-width dither/8 of a band per slider unit, matching PyDPainter's
// fixed-point dither (±32*gradient_dither out of 256) exactly — verified
// pixel-for-pixel against its source. `random` defaults to Math.random
// (genuine per-pixel randomness, as in the reference) but is injectable so
// tests can assert exact output.
function colorIdForPosition(
  pos: number,
  min: number,
  span: number,
  style: GradientFillStyle,
  bandCount: number,
  random: () => number
): number {
  if (span <= 0) {
    return style.rangeLow;
  }
  const numColors = bandCount + 1;
  const pointsPerColor = span / numColors;
  const ditherDivisor = style.ditherDivisor ?? DEFAULT_DITHER_DIVISOR;
  const ditherFactor = (style.dither / ditherDivisor) * pointsPerColor;
  const jitter = ditherFactor > 0 ? random() * ditherFactor - ditherFactor / 2 : 0;
  const colorIndex = Math.floor((pos - min + jitter) / pointsPerColor);
  return style.rangeLow + Math.max(0, Math.min(bandCount, colorIndex));
}

// Buckets an arbitrary point set by target color id. 'vertical'/'horizontal'
// normalize against the whole point set's own bounding box; 'horizontalLine'
// groups points by row first and normalizes each row against its own local
// x-extent, independently — the axis mode that makes a filled circle read as
// a sphere. Returns one Point[] per distinct resulting color id; the caller
// issues one ordinary single-color draw call per bucket.
export function bucketPointsByGradient(
  points: Point[],
  style: GradientFillStyle,
  random: () => number = Math.random
): Map<number, Point[]> {
  const buckets = new Map<number, Point[]>();
  const add = (colorId: number, point: Point): void => {
    const bucket = buckets.get(colorId);
    if (bucket) {
      bucket.push(point);
    } else {
      buckets.set(colorId, [point]);
    }
  };

  const bandCount = style.rangeHigh - style.rangeLow;
  if (bandCount <= 0) {
    // a degenerate (single-color) range: nothing to gradient, everything
    // gets that one color
    for (const point of points) {
      add(style.rangeLow, point);
    }
    return buckets;
  }

  if (style.axis === 'horizontalLine') {
    const rows = new Map<number, Point[]>();
    for (const point of points) {
      const row = rows.get(point.y);
      if (row) {
        row.push(point);
      } else {
        rows.set(point.y, [point]);
      }
    }
    for (const rowPoints of rows.values()) {
      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of rowPoints) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      }
      for (const point of rowPoints) {
        add(colorIdForPosition(point.x, minX, maxX - minX, style, bandCount, random), point);
      }
    }
    return buckets;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  for (const point of points) {
    const colorId =
      style.axis === 'vertical'
        ? colorIdForPosition(point.y, minY, maxY - minY, style, bandCount, random)
        : colorIdForPosition(point.x, minX, maxX - minX, style, bandCount, random);
    add(colorId, point);
  }
  return buckets;
}
