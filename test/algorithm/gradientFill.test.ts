import { describe, expect, test, vi } from 'vitest';
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
      // row 0: span 0..2 -> relative fractions 0, 0.5, 1
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

  test('dither=0 gives hard bands, floor-divided across the span', () => {
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 0 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      2: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
    });
  });

  test('dither=0 never calls the random source, regardless of what it would return', () => {
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 0 };
    const random = vi.fn(() => 0.5);
    bucketPointsByGradient([{ x: 0, y: 0 }], style, random);
    expect(random).not.toHaveBeenCalled();
  });

  test('dither jitters the raw pixel position by up to dither/4 of a band width, in either direction', () => {
    // range 1..2 over x=0..4 (span 4, pointsPerColor = 4/2 = 2); dither=6 ->
    // ditherFactor = (6/4)*2 = 3, so jitter is exactly -1.5 or +1.5 when the
    // random source is pinned to an extreme (half-width = dither/8 of a band,
    // matching PyDPainter). At min jitter (-1.5) only x=4 reaches color 2; at
    // max jitter (+1.5) everything from x=1 up crosses into color 2 while x=0
    // (starting deepest in color 1) still doesn't quite make it — the jitter
    // magnitude scales with band width, not a fixed pixel count.
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 6 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));

    const minJitter = bucketPointsByGradient(points, style, () => 0);
    expect(bucketMap(minJitter)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
      2: [{ x: 4, y: 0 }],
    });

    const maxJitter = bucketPointsByGradient(points, style, () => 1);
    expect(bucketMap(maxJitter)).toEqual({
      1: [{ x: 0, y: 0 }],
      2: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
    });
  });
});
