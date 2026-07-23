import { describe, expect, it, test, vi } from 'vitest';
import {
  bucketPointsByGradient,
  GradientFillStyle,
  gradientFillUniforms,
} from '../../src/algorithm/gradientFill';

function bucketMap(
  buckets: Map<number, { x: number; y: number }[]>
): Record<number, { x: number; y: number }[]> {
  return Object.fromEntries(buckets);
}

describe('bucketPointsByGradient', () => {
  test("vertical axis maps color id to each point's y position across the bounding box", () => {
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

  test("horizontal axis maps color id to each point's x position across the bounding box", () => {
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
    const style: GradientFillStyle = {
      axis: 'horizontalLine',
      rangeLow: 1,
      rangeHigh: 3,
      dither: 0,
    };
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
      1: [
        { x: 0, y: 0 },
        { x: 100, y: 10 },
      ],
      2: [
        { x: 1, y: 0 },
        { x: 101, y: 10 },
      ],
      3: [
        { x: 2, y: 0 },
        { x: 102, y: 10 },
      ],
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
    const style: GradientFillStyle = {
      axis: 'horizontalLine',
      rangeLow: 1,
      rangeHigh: 3,
      dither: 0,
    };
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
      1: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      2: [
        { x: 1, y: 0 },
        { x: 11, y: 0 },
      ],
      3: [
        { x: 2, y: 0 },
        { x: 12, y: 0 },
      ],
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
      4: [
        { x: 0, y: 0 },
        { x: 5, y: 9 },
      ],
    });
  });

  test('dither=0 gives hard bands, floor-divided across the span', () => {
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 0 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));
    const buckets = bucketPointsByGradient(points, style);
    expect(bucketMap(buckets)).toEqual({
      1: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      2: [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ],
    });
  });

  test('dither=0 never calls the random source, regardless of what it would return', () => {
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 0 };
    const random = vi.fn(() => 0.5);
    bucketPointsByGradient([{ x: 0, y: 0 }], style, random);
    expect(random).not.toHaveBeenCalled();
  });

  test('dither jitters the raw pixel position by up to dither/6 of a band width, in either direction', () => {
    // range 1..2 over x=0..4 (span 4, pointsPerColor = 4/2 = 2); dither=6,
    // default jitter=1/6 -> half-width = 6*(1/6)*2 = 2 exactly, so jitter is
    // exactly -2 or +2 when the random source is pinned to an extreme
    // (matches PyDPainter's hline() FillMode.HORIZ_FIT dither exactly). At
    // min jitter only x=4 reaches color 2; at max jitter every point
    // crosses into color 2, even x=0 (starting deepest in color 1) — the
    // jitter magnitude scales with band width, not a fixed pixel count.
    const style: GradientFillStyle = { axis: 'horizontal', rangeLow: 1, rangeHigh: 2, dither: 6 };
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 0 }));

    const minJitter = bucketPointsByGradient(points, style, () => 0);
    expect(bucketMap(minJitter)).toEqual({
      1: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      2: [{ x: 4, y: 0 }],
    });

    const maxJitter = bucketPointsByGradient(points, style, () => 1);
    expect(bucketMap(maxJitter)).toEqual({
      2: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ],
    });
  });
});

describe('gradientFillUniforms', () => {
  const style = { axis: 'vertical' as const, rangeLow: 5, rangeHigh: 9, dither: 6, jitter: 50 };

  it('maps a circle to center/radius and its inclusive pixel bounds', () => {
    const u = gradientFillUniforms(
      { kind: 'circle', center: { x: 50, y: 40 }, radius: 10 },
      style,
      7
    );
    expect(u.shapeKind).toBe(1);
    expect(u.center).toEqual({ x: 50, y: 40 });
    expect(u.radiusX).toBe(10);
    expect(u.radiusY).toBe(10);
    expect(u.rotation).toBe(0);
    expect({ left: u.left, top: u.top, right: u.right, bottom: u.bottom }).toEqual({
      left: 40,
      top: 30,
      right: 60,
      bottom: 50,
    });
  });

  it('vertical axis spans the bounds top to bottom (extent, not +1)', () => {
    const u = gradientFillUniforms(
      { kind: 'circle', center: { x: 50, y: 40 }, radius: 10 },
      style,
      7
    );
    expect(u.axisMode).toBe(0);
    expect(u.axisMin).toBe(30);
    expect(u.axisSpan).toBe(20);
  });

  it('horizontal axis spans left to right', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 12, y: 3 }, end: { x: 2, y: 8 } },
      { ...style, axis: 'horizontal' },
      7
    );
    expect(u.shapeKind).toBe(0);
    expect(u.axisMode).toBe(1);
    // start/end normalize: bounds are min/max of the two corners
    expect({ left: u.left, top: u.top, right: u.right, bottom: u.bottom }).toEqual({
      left: 2,
      top: 3,
      right: 12,
      bottom: 8,
    });
    expect(u.axisMin).toBe(2);
    expect(u.axisSpan).toBe(10);
    expect(u.center).toEqual({ x: 7, y: 5.5 });
  });

  it('converts the 1-based range to 0-based storage and premultiplies dither', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 9, y: 9 } },
      style,
      7
    );
    expect(u.bandCount).toBe(4); // 9 - 5
    expect(u.rangeLowIndex).toBe(4); // 5 - 1
    expect(u.ditherJitter).toBe(3); // 6 * 50 / 100
    expect(u.seed).toBe(7);
  });

  it('defaults jitter to the module default (100/6) when omitted', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 9, y: 9 } },
      { axis: 'vertical', rangeLow: 1, rangeHigh: 3, dither: 6 },
      7
    );
    expect(u.ditherJitter).toBeCloseTo(1); // 6 * (100/6) / 100
  });

  it('bounds of a rotated ellipse cover the rotated extents', () => {
    // 90 degrees: x/y extents swap
    const u = gradientFillUniforms(
      { kind: 'ellipse', center: { x: 100, y: 100 }, radiusX: 20, radiusY: 5, rotationAngle: 90 },
      style,
      7
    );
    expect(u.shapeKind).toBe(2);
    expect(u.rotation).toBeCloseTo(Math.PI / 2);
    expect(u.left).toBeLessThanOrEqual(95);
    expect(u.right).toBeGreaterThanOrEqual(105);
    expect(u.top).toBeLessThanOrEqual(80);
    expect(u.bottom).toBeGreaterThanOrEqual(120);
  });

  it('horizontalLine axis still carries the bbox span (the rect rows use it)', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 2, y: 3 }, end: { x: 12, y: 8 } },
      { ...style, axis: 'horizontalLine' },
      7
    );
    expect(u.axisMode).toBe(2);
    expect(u.axisMin).toBe(2);
    expect(u.axisSpan).toBe(10);
  });

  it('maps a polygon to its vertex bbox and passes the vertices through', () => {
    const vertices = [
      { x: 10, y: 40 },
      { x: 30, y: 10 },
      { x: 50, y: 40 },
    ];
    const u = gradientFillUniforms({ kind: 'polygon', vertices }, style, 7);
    expect(u.shapeKind).toBe(3);
    expect({ left: u.left, top: u.top, right: u.right, bottom: u.bottom }).toEqual({
      left: 10,
      top: 10,
      right: 50,
      bottom: 40,
    });
    expect(u.center).toEqual({ x: 30, y: 25 });
    expect(u.vertices).toEqual(vertices);
  });

  it('every non-polygon shape carries an empty vertices array', () => {
    const u = gradientFillUniforms({ kind: 'circle', center: { x: 0, y: 0 }, radius: 5 }, style, 7);
    expect(u.vertices).toEqual([]);
  });
});
