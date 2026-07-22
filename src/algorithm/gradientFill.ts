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
  // How far dither can push a pixel's position, as a percentage of a band's
  // own width, per unit of dither (half-width = dither * jitter% of a
  // band). 17 (the default when omitted, ~1/6) matches PyDPainter's
  // hline() FillMode.HORIZ_FIT dither exactly (ditherfactor =
  // gradient_dither/3.0 * pointspercolor, half-width = ditherfactor/2 =
  // gradient_dither/6 * pointspercolor) — see colorIdForPosition. Exposed
  // as a parameter, rather than only the fixed constant, so the Fill Style
  // requester can offer it as an experimental tuning slider without the
  // algorithm needing to know about the UI.
  jitter?: number;
};

const DEFAULT_JITTER_PERCENT = 100 / 6;

// The color id for one pixel at `pos` along an axis spanning [min, min+span)
// over bandCount+1 colors. Each color owns a "pointsPerColor"-wide band of
// raw positions (floor-divided, not rounded — matching the reference); with
// dither > 0, pos is jittered first by up to +/-(dither * jitter% *
// pointsPerColor) pixels — the jitter range grows with the band width
// itself, which is why high dither can blend a pixel several bands away,
// not just its immediate neighbor. jitter=1/6 (the default) matches
// PyDPainter's hline() dither for FillMode.HORIZ_FIT ("Horizontal Line")
// exactly — verified against prim.py's hline(): ditherfactor =
// gradient_dither/3.0 * pointspercolor, half-width = ditherfactor/2.
// `random` defaults to Math.random (genuine per-pixel randomness, as in
// the reference) but is injectable so tests can assert exact output.
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
  const jitterPercent = style.jitter ?? DEFAULT_JITTER_PERCENT;
  const halfWidth = style.dither * (jitterPercent / 100) * pointsPerColor;
  const jitter = halfWidth > 0 ? random() * 2 * halfWidth - halfWidth : 0;
  const colorIndex = Math.floor((pos - min + jitter) / pointsPerColor);
  return style.rangeLow + Math.max(0, Math.min(bandCount, colorIndex));
}

// Buckets an arbitrary point set by target color id. 'vertical'/'horizontal'
// normalize against the whole point set's own bounding box; 'horizontalLine'
// groups points by row first and normalizes each row's *contiguous runs*
// against their own local x-extent, independently — the axis mode that
// makes a filled circle read as a sphere. Splitting each row into
// contiguous runs (rather than one bbox per row) matters for flood fill in
// particular: PyDPainter's floodfill() builds one scanline fragment per
// contiguous run and draws each with its own hline() call, normalized only
// to that fragment's own span (prim.py's hline(), the FillMode.HORIZ_FIT
// branch — not the row's overall extent bridging any gap). A row with a
// gap (a ring, a crescent, anything with a "waist") would otherwise stretch
// the gradient across the gap instead of restarting it per run. Returns one
// Point[] per distinct resulting color id; the caller issues one ordinary
// single-color draw call per bucket.
export function bucketPointsByGradient(
  points: Point[],
  style: GradientFillStyle,
  random: () => number = Math.random
): Map<number, Point[]> {
  const bandCount = style.rangeHigh - style.rangeLow;
  if (bandCount <= 0) {
    // a degenerate (single-color) range: nothing to gradient, everything
    // gets that one color
    return new Map([[style.rangeLow, points]]);
  }

  // Bucketed by a plain array indexed by (colorId - rangeLow) rather than a
  // Map: bandCount+1 is small and bounded (a palette range), so this avoids
  // hashing/boxing overhead in the classification loop below, which is the
  // hot path for a large filled shape (one call per pixel).
  const bucketArray: (Point[] | undefined)[] = new Array(bandCount + 1);
  const add = (colorId: number, point: Point): void => {
    const index = colorId - style.rangeLow;
    const bucket = bucketArray[index];
    if (bucket) {
      bucket.push(point);
    } else {
      bucketArray[index] = [point];
    }
  };

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
      const sorted = [...rowPoints].sort((a, b) => a.x - b.x);
      let runStart = 0;
      for (let i = 1; i <= sorted.length; i++) {
        if (i === sorted.length || sorted[i].x - sorted[i - 1].x > 1) {
          const minX = sorted[runStart].x;
          const maxX = sorted[i - 1].x;
          for (let j = runStart; j < i; j++) {
            add(
              colorIdForPosition(sorted[j].x, minX, maxX - minX, style, bandCount, random),
              sorted[j]
            );
          }
          runStart = i;
        }
      }
    }
  } else {
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
  }

  const buckets = new Map<number, Point[]>();
  for (let index = 0; index < bucketArray.length; index++) {
    const bucket = bucketArray[index];
    if (bucket) {
      buckets.set(style.rangeLow + index, bucket);
    }
  }
  return buckets;
}
