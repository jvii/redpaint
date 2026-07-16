import { describe, it, expect } from 'vitest';
import { cycleColorIndex } from '../../src/algorithm/cycle';

describe('cycleColorIndex', () => {
  const range = { start: 2, end: 5, wholePalette: false };

  it('walks the range from its start, one color per step', () => {
    expect(cycleColorIndex(range, 0)).toBe(2);
    expect(cycleColorIndex(range, 1)).toBe(3);
    expect(cycleColorIndex(range, 3)).toBe(5);
  });

  it('wraps around the range', () => {
    expect(cycleColorIndex(range, 4)).toBe(2);
    expect(cycleColorIndex(range, 9)).toBe(3);
  });

  it('handles a single-color range', () => {
    expect(cycleColorIndex({ start: 7, end: 7, wholePalette: false }, 5)).toBe(7);
  });
});
