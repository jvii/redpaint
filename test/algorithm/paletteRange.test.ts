import { describe, it, expect } from 'vitest';
import { activeRangeIndices } from '../../src/algorithm/paletteRange';

describe('activeRangeIndices', () => {
  const ranges = [
    { start: '3', end: '6' },
    null,
    { start: '10', end: '8' }, // stored reversed — still a valid span 8..10
    { start: '6', end: '12' }, // overlaps range 1 at color 6
  ];

  it('resolves the first range containing the FG color (0-based, inclusive)', () => {
    expect(activeRangeIndices(ranges, '4', false, 32)).toEqual({
      start: 2,
      end: 5,
      wholePalette: false,
    });
  });

  it('normalizes reversed ranges', () => {
    expect(activeRangeIndices(ranges, '9', false, 32)).toEqual({
      start: 7,
      end: 9,
      wholePalette: false,
    });
  });

  it('a color in two ranges selects the first (DPaint precedence)', () => {
    expect(activeRangeIndices(ranges, '6', false, 32)).toEqual({
      start: 2,
      end: 5,
      wholePalette: false,
    });
  });

  it('falls back to the whole palette when the FG color is in no range', () => {
    expect(activeRangeIndices(ranges, '20', false, 32)).toEqual({
      start: 0,
      end: 31,
      wholePalette: true,
    });
  });

  it('falls back to the whole palette when the FG is a true-color pick', () => {
    expect(activeRangeIndices(ranges, '4', true, 32)).toEqual({
      start: 0,
      end: 31,
      wholePalette: true,
    });
  });

  it('falls back to the whole palette when no ranges are defined', () => {
    expect(activeRangeIndices([null, null, null, null], '4', false, 16)).toEqual({
      start: 0,
      end: 15,
      wholePalette: true,
    });
  });
});
