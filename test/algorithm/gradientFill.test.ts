import { describe, expect, test } from 'vitest';
import { bucketPointsByGradient, GradientFillStyle } from '../../src/algorithm/gradientFill';

function bucketMap(buckets: Map<number, { x: number; y: number }[]>): Record<number, { x: number; y: number }[]> {
  return Object.fromEntries(buckets);
}

describe('bucketPointsByGradient', () => {
  test('vertical axis maps color id to each point\'s y position across the bounding box', () => {
    const style: GradientFillStyle = { axis: 'vertical', rangeLow: 1, rangeHigh: 5, dither: 0 };
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }],
      2: [{ x: 0, y: 1 }],
      3: [{ x: 0, y: 2 }],
      4: [{ x: 0, y: 3 }],
      5: [{ x: 0, y: 4 }],
    });
  });

  test('horizontal axis maps color id to each point\'s x position across the bounding box', () => {
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 5, dither: 0 };
    const points = [
      { x: 0, y: 7 },
      { x: 1, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 7 },
      { x: 4, y: 7 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 7 }],
      2: [{ x: 1, y: 7 }],
      3: [{ x: 2, y: 7 }],
      4: [{ x: 3, y: 7 }],
      5: [{ x: 4, y: 7 }],
    });
  });

  test('horizontalLine normalizes each row against its own local x-extent, independently', () => {
    const style: GradientFillStyle = { axis: 'horizontalLine', rangeLow: 1, rangeHigh: 3, dither: 0 };
    const points = [
      // row 0: span 0..2 -> t = 0, 0.5, 1
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      // row 10: span 100..104, but the same *relative* positions (0, 0.5, 1)
      { x: 100, y: 10 },
      { x: 102, y: 10 },
      { x: 104, y: 10 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 100, y: 10 }],
      2: [{ x: 1, y: 0 }, { x: 102, y: 10 }],
      3: [{ x: 2, y: 0 }, { x: 104, y: 10 }],
    });
  });

  test('a degenerate (single-color) range puts every point in the one bucket', () => {
    const style: GradientFillStyle = { axis: 'vertical', rangeLow: 4, rangeHigh: 4, dither: 0 };
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 9 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      4: [{ x: 0, y: 0 }, { x: 5, y: 9 }],
    });
  });

  test('dither=0 gives hard bands: the midpoint of a 2-color range rounds up', () => {
    // t = 0, 0.25, 0.5, 0.75, 1 across x=0..4; band boundary sits exactly at
    // x=2 (t=0.5) — Math.round rounds .5 up, so it lands in the second color
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 0 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      2: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
    });
  });

  test('dither perturbs pixels via a deterministic pseudo-random hash, not true randomness', () => {
    // same scenario as above, but with dither=20 (max): pixels whose hash
    // pushes them past a rounding threshold flip band; the assignment is
    // exact and reproducible (same hash every run), even though it looks
    // patternless
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 20 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      2: [{ x: 3, y: 0 }, { x: 4, y: 0 }],
    });
  });
});
