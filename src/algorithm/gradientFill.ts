import { Point } from '../types';

// DPaint II's gradient fill: a spatial axis mapped onto a palette range's
// contiguous color band. See docs/true-color-mode.md and the Fill Style
// requester (src/components/fillStyle/) for the user-facing picture.
export type GradientAxis = 'vertical' | 'horizontal' | 'horizontalLine';

export type GradientFillStyle = {
  axis: GradientAxis;
  rangeLow: number; // 1-based color id, inclusive — same units as PaintColor.colorNumber
  rangeHigh: number; // 1-based color id, inclusive
  dither: number; // 0..20, 0 = off — same scale as PyDPainter's Random dither slider
};

const MAX_DITHER = 20;

// A deterministic per-pixel pseudo-random value in [0, 1), used to perturb
// each pixel's band position. DPaint II's own gradient dither is genuinely
// noisy (speckled, not a repeating tile — confirmed against a real
// screenshot), so this is a hash rather than an ordered/Bayer matrix: same
// visual character as true randomness, but reproducible from a pixel's own
// coordinates (no per-run variation, no seed to manage). Integer bit-mixing
// hash (splitmix-style finalizer), not cryptographic — just needs to look
// patternless at a glance.
function pseudoRandom(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Maps a normalized position t (0..1) plus this pixel's dither offset to a
// palette color id within [rangeLow, rangeHigh]. bandCount is the number of
// steps between the range's ends (rangeHigh - rangeLow); dither=MAX_DITHER
// can shift a pixel by up to half a band, same ceiling as before the slider
// was rescaled to 0..20.
function colorIdFor(t: number, point: Point, style: GradientFillStyle, bandCount: number): number {
  const offset = pseudoRandom(point.x, point.y) - 0.5; // centered, roughly [-0.5, 0.5)
  const strength = style.dither / MAX_DITHER;
  const perturbed = t + (offset * strength) / bandCount;
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
