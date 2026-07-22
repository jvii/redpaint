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
  const crng = (
    low: number,
    high: number,
    extra: Partial<{ rate: number; active: boolean; reverse: boolean }> = {}
  ): { low: number; high: number; rate: number; active: boolean; reverse: boolean } => ({
    low,
    high,
    rate: 8192,
    active: true,
    reverse: false,
    ...extra,
  });

  it('maps CRNG positions to 1-based color ids and keeps rate/active/reverse', () => {
    const ranges = cycleRangesToPaletteRanges([crng(2, 5, { rate: 16384, reverse: true })]);
    expect(ranges[0]).toEqual({
      start: '3',
      end: '6',
      rate: 16384,
      active: true,
      reverse: true,
    });
  });

  it('pads with nulls up to the six default slots', () => {
    const ranges = cycleRangesToPaletteRanges([crng(0, 3)]);
    expect(ranges).toHaveLength(6);
    expect(ranges.slice(1)).toEqual([null, null, null, null, null]);
  });

  it('keeps every usable range — no cap at the default slot count', () => {
    const eight = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => crng(i * 2, i * 2 + 1));
    const ranges = cycleRangesToPaletteRanges(eight);
    expect(ranges).toHaveLength(8);
    expect(ranges.every((r) => r !== null)).toBe(true);
  });

  it('drops degenerate ranges (DPaint writes unset slots as low >= high)', () => {
    const ranges = cycleRangesToPaletteRanges([crng(0, 0), crng(5, 3), crng(1, 2)]);
    expect(ranges[0]).toMatchObject({ start: '2', end: '3' });
    expect(ranges).toHaveLength(6);
    expect(ranges[1]).toBeNull();
  });

  it('keeps an inactive range (gradient-only CRNG) as data', () => {
    const ranges = cycleRangesToPaletteRanges([crng(1, 4, { active: false })]);
    expect(ranges[0]).toMatchObject({ active: false });
  });
});
