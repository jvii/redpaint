import { RangeIndices, CycleRange } from './paletteRange';
import { Color } from '../types';

// The Cycle paint mode's color for the given stamp ordinal: walks the active
// range from its start and wraps. Returns a 0-based storage index.
export function cycleColorIndex(range: RangeIndices, step: number): number {
  const span = range.end - range.start + 1;
  return range.start + (step % span);
}

export const CRNG_FULL_RATE = 16384; // the CRNG unit: 16384 = 60 steps/second
export const MAX_STEPS_PER_SECOND = 60;

export function rateToStepsPerSecond(rate: number): number {
  return (rate / CRNG_FULL_RATE) * MAX_STEPS_PER_SECOND;
}

export function stepsPerSecondToRate(steps: number): number {
  return Math.round((steps / MAX_STEPS_PER_SECOND) * CRNG_FULL_RATE);
}

// Fractional cycling progress, advanced by wall-clock time: one accumulator
// per range slot. Null/inactive/rate-0 slots hold still. Pure — the caller
// (CycleDriver) owns the clock.
export function advanceCycleSteps(
  accumulators: number[],
  ranges: (CycleRange | null)[],
  elapsedMs: number
): number[] {
  return ranges.map((range, i) => {
    const acc = accumulators[i] ?? 0;
    if (!range || !range.active) {
      return acc;
    }
    return acc + (elapsedMs / 1000) * rateToStepsPerSecond(range.rate);
  });
}

function spanOf(range: CycleRange): { lo: number; span: number } {
  const lo = Math.min(Number(range.start), Number(range.end));
  const hi = Math.max(Number(range.start), Number(range.end));
  return { lo, span: hi - lo + 1 };
}

// Integer rotation offset per slot: whole steps taken, wrapped to the span.
// Reverse runs the other way around; the result is normalized to
// 0..span-1 either way, so consumers never see a negative offset.
export function cycleOffsetsOf(accumulators: number[], ranges: (CycleRange | null)[]): number[] {
  return ranges.map((range, i) => {
    if (!range || !range.active) {
      return 0;
    }
    const { span } = spanOf(range);
    if (span <= 1) {
      return 0;
    }
    const steps = Math.floor(accumulators[i] ?? 0) % span;
    return range.reverse ? steps : (span - steps) % span;
  });
}

// The palette as displayed: each active range's slots rotated by its offset.
// Forward direction (docs/color-cycling.md): slot i shows the base color of
// s + ((i - s + k) mod span) — every range reads from the *base* palette,
// and slots apply in order, so on overlap the later range wins.
export function cycledPalette(
  palette: { [id: string]: Color },
  ranges: (CycleRange | null)[],
  offsets: number[]
): { [id: string]: Color } {
  const display = { ...palette };
  ranges.forEach((range, i) => {
    const offset = offsets[i] ?? 0;
    if (!range || !range.active || offset === 0) {
      return;
    }
    const { lo, span } = spanOf(range);
    if (span <= 1) {
      return;
    }
    for (let id = lo; id < lo + span; id++) {
      const source = palette[String(lo + ((id - lo + offset) % span))];
      if (source) {
        display[String(id)] = source;
      }
    }
  });
  return display;
}

// The 256x1 RGBA palette texture, cycled — shared by both canvas
// controllers' texture uploads so rotation can't drift between them.
// Integer-like keys iterate in ascending numeric order, so Object.values
// yields the colors in id order (same assumption as paletteArray).
export function paletteTextureData(
  palette: { [id: string]: Color },
  ranges: (CycleRange | null)[],
  offsets: number[]
): Uint8Array {
  const colors = Object.values(cycledPalette(palette, ranges, offsets));
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < colors.length; i++) {
    data[i * 4 + 0] = colors[i].r;
    data[i * 4 + 1] = colors[i].g;
    data[i * 4 + 2] = colors[i].b;
    data[i * 4 + 3] = 255;
  }
  return data;
}
