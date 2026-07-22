import { describe, it, expect } from 'vitest';
import { cycleColorIndex } from '../../src/algorithm/cycle';
import {
  advanceCycleSteps,
  cycleOffsetsOf,
  cycledPalette,
  paletteTextureData,
  rateToStepsPerSecond,
  stepsPerSecondToRate,
} from '../../src/algorithm/cycle';
import { CycleRange } from '../../src/algorithm/paletteRange';

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

const range = (start: string, end: string, extra: Partial<CycleRange> = {}): CycleRange => ({
  start,
  end,
  rate: 8192,
  active: true,
  reverse: false,
  ...extra,
});

describe('rate conversions', () => {
  it('16384 CRNG units is 60 steps per second', () => {
    expect(rateToStepsPerSecond(16384)).toBe(60);
    expect(stepsPerSecondToRate(60)).toBe(16384);
  });

  it('round-trips whole steps-per-second values', () => {
    for (let s = 0; s <= 60; s++) {
      expect(Math.round(rateToStepsPerSecond(stepsPerSecondToRate(s)))).toBe(s);
    }
  });
});

describe('advanceCycleSteps', () => {
  it('advances by rate over elapsed time', () => {
    // 16384 = 60 steps/s -> 1000ms adds 60 steps; 8192 -> 500ms adds 15
    expect(advanceCycleSteps([0], [range('1', '4', { rate: 16384 })], 1000)).toEqual([60]);
    expect(advanceCycleSteps([2], [range('1', '4', { rate: 8192 })], 500)).toEqual([17]);
  });

  it('accumulates fractional steps', () => {
    const [acc] = advanceCycleSteps([0], [range('1', '4', { rate: 16384 })], 10);
    expect(acc).toBeCloseTo(0.6);
  });

  it('holds still for null, inactive, and rate-0 slots', () => {
    const ranges = [null, range('1', '4', { active: false }), range('1', '4', { rate: 0 })];
    expect(advanceCycleSteps([1, 2, 3], ranges, 1000)).toEqual([1, 2, 3]);
  });

  it('treats a missing accumulator as 0 (range list grew mid-flight)', () => {
    expect(advanceCycleSteps([], [range('1', '4', { rate: 16384 })], 1000)).toEqual([60]);
  });
});

describe('cycleOffsetsOf', () => {
  it('wraps whole steps to the range span', () => {
    // span 3 (ids 2..4): 5.9 steps -> floor 5 -> offset (3 - 5%3) = 1
    expect(cycleOffsetsOf([5.9], [range('2', '4')])).toEqual([1]);
  });

  it('reverse runs the offset the other way around the span', () => {
    expect(cycleOffsetsOf([5.9], [range('2', '4', { reverse: true })])).toEqual([2]);
    // a whole number of laps is offset 0 in either direction
    expect(cycleOffsetsOf([3], [range('2', '4', { reverse: true })])).toEqual([0]);
  });

  it('is 0 for null, inactive, and single-color slots', () => {
    const ranges = [null, range('1', '4', { active: false }), range('7', '7')];
    expect(cycleOffsetsOf([9, 9, 9], ranges)).toEqual([0, 0, 0]);
  });
});

describe('cycledPalette', () => {
  const palette = {
    '1': { r: 10, g: 0, b: 0 },
    '2': { r: 20, g: 0, b: 0 },
    '3': { r: 30, g: 0, b: 0 },
    '4': { r: 40, g: 0, b: 0 },
    '5': { r: 50, g: 0, b: 0 },
  };

  it('is the identity at offset 0', () => {
    expect(cycledPalette(palette, [range('2', '4')], [0])).toEqual(palette);
  });

  it('rotates a range: forward offset k shows the color k slots later', () => {
    // docs/color-cycling.md: display[i] = base[s + ((i - s + k) mod span)]
    const display = cycledPalette(palette, [range('2', '4')], [1]);
    expect(display['2']).toEqual(palette['3']);
    expect(display['3']).toEqual(palette['4']);
    expect(display['4']).toEqual(palette['2']);
    expect(display['1']).toEqual(palette['1']); // outside the range: untouched
    expect(display['5']).toEqual(palette['5']);
  });

  it('reads each range from the base palette; later slots win on overlap', () => {
    const display = cycledPalette(palette, [range('1', '3'), range('3', '5')], [1, 1]);
    expect(display['2']).toEqual(palette['3']); // from range 1
    expect(display['3']).toEqual(palette['4']); // range 2 overwrites range 1's wrap
    expect(display['5']).toEqual(palette['3']); // range 2 wraps from base, not display
  });

  it('skips inactive and null slots', () => {
    const display = cycledPalette(palette, [null, range('2', '4', { active: false })], [3, 3]);
    expect(display).toEqual(palette);
  });

  it('normalizes reversed endpoints (stored end < start)', () => {
    const display = cycledPalette(palette, [range('4', '2')], [1]);
    expect(display['2']).toEqual(palette['3']);
  });
});

describe('paletteTextureData', () => {
  it('packs the cycled colors as 256 RGBA bytes, alpha 255', () => {
    const palette = { '1': { r: 1, g: 2, b: 3 }, '2': { r: 4, g: 5, b: 6 } };
    const data = paletteTextureData(palette, [range('1', '2')], [1]);
    expect(data.length).toBe(256 * 4);
    expect([...data.slice(0, 8)]).toEqual([4, 5, 6, 255, 1, 2, 3, 255]);
    expect(data[8]).toBe(0); // slots beyond the palette stay zeroed
  });
});
