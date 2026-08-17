import { describe, expect, test } from 'vitest';
import { BUNDLED_OUTLINE_FACES, bundledOutlineFace } from '../../src/domain/BundledFonts';
import {
  SIZE_MAX,
  SYSTEM_SIZE_MIN,
  constrainSize,
  sizeRangeFor,
} from '../../src/overmind/font/state';

// A bundled face is only crisp at whole multiples of the grid it was drawn on,
// so its size slider steps by that grid. An installed family has no grid but
// does have a floor, below which an outline breaks up under thresholding.
// Changing family has to bring the current size into whichever range now
// applies, or the slider and the state disagree about what is in force.
describe('font sizes', () => {
  test('every bundled face declares its grid', () => {
    for (const face of BUNDLED_OUTLINE_FACES) {
      expect(face.gridSize).toBeGreaterThan(0);
    }
  });

  test('a bundled face steps by its grid and starts there', () => {
    expect(sizeRangeFor(8)).toEqual({ min: 8, max: SIZE_MAX, step: 8 });
  });

  test('a system face steps by one and starts at the floor', () => {
    expect(sizeRangeFor(undefined)).toEqual({
      min: SYSTEM_SIZE_MIN,
      max: SIZE_MAX,
      step: 1,
    });
  });

  test('constraining a bundled size lands on the grid and in range', () => {
    const range = sizeRangeFor(8);
    for (const size of [1, 9, 13, 20, 37, 100, 1000]) {
      const constrained = constrainSize(size, range);
      expect(constrained % 8).toBe(0);
      expect(constrained).toBeGreaterThanOrEqual(range.min);
      expect(constrained).toBeLessThanOrEqual(range.max);
    }
  });

  test('constraining picks the nearest step', () => {
    const range = sizeRangeFor(8);
    expect(constrainSize(10, range)).toBe(8);
    expect(constrainSize(14, range)).toBe(16);
    expect(constrainSize(24, range)).toBe(24);
  });

  test('a system size is lifted to the floor rather than snapped away', () => {
    const range = sizeRangeFor(undefined);
    expect(constrainSize(8, range)).toBe(SYSTEM_SIZE_MIN);
    expect(constrainSize(21, range)).toBe(21);
    expect(constrainSize(1000, range)).toBe(SIZE_MAX);
  });

  test('lookup finds a bundled face and misses an installed one', () => {
    expect(bundledOutlineFace('Silkscreen')?.gridSize).toBe(8);
    expect(bundledOutlineFace('Arial')).toBeUndefined();
  });
});
