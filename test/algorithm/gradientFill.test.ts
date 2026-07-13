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
      // row 0: span 0..2 (3 points, contiguous) -> relative fractions 0, 0.5, 1
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      // row 10: span 100..102, a wider row, same relative shape as row 0 but
      // shifted — normalized independently rather than against row 0's span
      { x: 100, y: 10 },
      { x: 101, y: 10 },
      { x: 102, y: 10 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 100, y: 10 }],
      2: [{ x: 1, y: 0 }, { x: 101, y: 10 }],
      3: [{ x: 2, y: 0 }, { x: 102, y: 10 }],
    });
  });

  test('horizontalLine normalizes each contiguous run on a row independently, not the row as a whole', () => {
    // a flood-filled ring/crescent: one row can have two disjoint fragments
    // (a gap in the middle) — PyDPainter's floodfill() draws each merged
    // scanline fragment with its own hline() call, each normalized to its
    // own local span; bridging the gap into one wide span (as if it were a
    // single run) is the bug this guards against. Both runs are the same
    // relative shape (3 contiguous points), so both should land on the same
    // 1,2,3 pattern despite the second starting at x=10, not x=0.
    const style: GradientFillStyle = { axis: 'horizontalLine', rangeLow: 1, rangeHigh: 3, dither: 0 };
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      // gap: x=3..9 unfilled
      { x: 10, y: 0 },
      { x: 11, y: 0 },
      { x: 12, y: 0 },
    ];
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      2: [{ x: 1, y: 0 }, { x: 11, y: 0 }],
      3: [{ x: 2, y: 0 }, { x: 12, y: 0 }],
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

  test('dither jitters the raw pixel position by up to ~dither/8 of a band width, in either direction', () => {
    // range 1..2 over x=0..4 (span 4, pointsPerColor = 4/2 = 2); dither=6,
    // default jitter=13% -> half-width = 6*0.13*2 = 1.56, so jitter is
    // exactly -1.56 or +1.56 when the random source is pinned to an extreme
    // (close to PyDPainter's dither/8 of a band). At min jitter only x=4
    // reaches color 2; at max jitter everything from x=1 up crosses into
    // color 2 while x=0 (starting deepest in color 1) still doesn't quite
    // make it — the jitter magnitude scales with band width, not a fixed
    // pixel count.
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
