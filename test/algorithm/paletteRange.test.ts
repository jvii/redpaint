import { describe, it, expect } from 'vitest';
import { activeRangeIndices, cycleRangesToPaletteRanges } from '../../src/algorithm/paletteRange';

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

describe('cycleRangesToPaletteRanges', () => {
  it('converts 0-based CRNG low/high to 1-based start/end strings', () => {
    expect(cycleRangesToPaletteRanges([{ low: 3, high: 11 }])).toEqual([
      { start: '4', end: '12' },
      null,
      null,
      null,
    ]);
  });

  it('drops degenerate ranges (low >= high)', () => {
    expect(cycleRangesToPaletteRanges([{ low: 5, high: 5 }, { low: 5, high: 5 }])).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('keeps only the first 4, in order', () => {
    const ranges = [0, 1, 2, 3, 4].map((i) => ({ low: i, high: i + 1 }));
    expect(cycleRangesToPaletteRanges(ranges)).toEqual([
      { start: '1', end: '2' },
      { start: '2', end: '3' },
      { start: '3', end: '4' },
      { start: '4', end: '5' },
    ]);
  });

  it('returns all nulls for an empty input', () => {
    expect(cycleRangesToPaletteRanges([])).toEqual([null, null, null, null]);
  });
});
