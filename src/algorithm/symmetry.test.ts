import { describe, expect, test } from 'vitest';
import { symmetryCopies } from './symmetry';

describe('symmetryCopies', () => {
  test('order 1 without mirror is just the identity', () => {
    const copies = symmetryCopies({ center: { x: 0, y: 0 }, order: 1, mirror: false });
    expect(copies).toHaveLength(1);
    expect(copies[0].angleDegrees).toBe(0);
    expect(copies[0].mirror).toBe(false);
    expect(copies[0].point({ x: 7, y: 3 })).toEqual({ x: 7, y: 3 });
  });

  test('order 4 rotates in 90 degree steps around the center', () => {
    const copies = symmetryCopies({ center: { x: 0, y: 0 }, order: 4, mirror: false });
    expect(copies.map((c) => c.angleDegrees)).toEqual([0, 90, 180, 270]);
    // +0 normalizes the occasional -0 that falls out of rounding a tiny
    // negative float from cos/sin at these angles — same pixel, not a bug
    const rotated = copies.map((c) => {
      const p = c.point({ x: 10, y: 0 });
      return { x: p.x + 0, y: p.y + 0 };
    });
    expect(rotated).toEqual([
      { x: 10, y: 0 },
      { x: 0, y: -10 },
      { x: -10, y: 0 },
      { x: 0, y: 10 },
    ]);
  });

  test('mirror doubles the copy count, interleaved as rotation/mirror pairs', () => {
    const copies = symmetryCopies({ center: { x: 0, y: 0 }, order: 2, mirror: true });
    expect(copies).toHaveLength(4);
    expect(copies.map((c) => c.mirror)).toEqual([false, true, false, true]);
  });

  test('a mirror copy reflects across the vertical axis through the center', () => {
    const copies = symmetryCopies({ center: { x: 5, y: 5 }, order: 1, mirror: true });
    expect(copies[1].point({ x: 8, y: 5 })).toEqual({ x: 2, y: 5 });
  });

  test('order is clamped to the 1..40 range', () => {
    expect(symmetryCopies({ center: { x: 0, y: 0 }, order: 0, mirror: false })).toHaveLength(1);
    expect(symmetryCopies({ center: { x: 0, y: 0 }, order: 100, mirror: false })).toHaveLength(40);
  });
});
