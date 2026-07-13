import { Point } from '../types';

// DPaint II's gradient fill: a spatial axis mapped onto a palette range's
// contiguous color band. See docs/true-color-mode.md and the Fill Style
// requester (src/components/fillStyle/) for the user-facing picture.
export type GradientAxis = 'vertical' | 'horizontal' | 'horizontalLine';

export type GradientFillStyle = {
  axis: GradientAxis;
  rangeLow: number; // 1-based color id, inclusive — same units as PaintColor.colorNumber
  rangeHigh: number; // 1-based color id, inclusive
  dither: number; // 0..1, ordered-dither overlap amount between adjacent bands
};

// A 4x4 Bayer matrix, used to perturb each pixel's band position by a fixed,
// repeatable amount instead of true randomness — deterministic and the
// period-correct look (see docs/true-color-mode.md). Values normalized to a
// threshold centered at 0, roughly [-0.5, 0.5).
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function ditherOffset(x: number, y: number): number {
  const row = BAYER_4X4[((y % 4) + 4) % 4];
  return (row[((x % 4) + 4) % 4] + 0.5) / 16 - 0.5;
}

// Maps a normalized position t (0..1) plus this pixel's dither offset to a
// palette color id within [rangeLow, rangeHigh]. bandCount is the number of
// steps between the range's ends (rangeHigh - rangeLow); the dither
// perturbation is scaled so dither=1 can shift a pixel by up to half a band.
function colorIdFor(t: number, point: Point, style: GradientFillStyle, bandCount: number): number {
  const perturbed = t + (ditherOffset(point.x, point.y) * style.dither) / bandCount;
  const clamped = Math.max(0, Math.min(1, perturbed));
  return style.rangeLow + Math.round(clamped * bandCount);
}

// Buckets an arbitrary point set by target color id. 'vertical'/'horizontal'
// normalize against the whole point set's own bounding box; 'horizontalLine'
// groups points by row first and normalizes each row against its own local
// x-extent, independently — the axis mode that makes a filled circle read as
// a sphere. Returns one Point[] per distinct resulting color id; the caller
// issues one ordinary single-color draw call per bucket.
export function bucketPointsByGradient(points: Point[], style: GradientFillStyle): Map<number, Point[]> {
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
      const span = maxX - minX;
      for (const point of rowPoints) {
        const t = span > 0 ? (point.x - minX) / span : 0;
        add(colorIdFor(t, point, style, bandCount), point);
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
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  for (const point of points) {
    const t =
      style.axis === 'vertical'
        ? spanY > 0
          ? (point.y - minY) / spanY
          : 0
        : spanX > 0
          ? (point.x - minX) / spanX
          : 0;
    add(colorIdFor(t, point, style, bandCount), point);
  }
  return buckets;
}
