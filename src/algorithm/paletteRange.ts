// The active cycle range, DPaint's rule: the first PaletteRange containing
// the current foreground color; if the FG color is in no range — or is a
// literal RGB pick with no palette id at all — the whole palette acts as the
// range. Returns 0-based storage indices for the shaders; app-level color
// ids are 1-based. See docs/effects.md.
export interface RangeIndices {
  start: number; // 0-based palette storage index, inclusive
  end: number; // 0-based, inclusive, start <= end
  wholePalette: boolean; // true when no real range applies
}

export function activeRangeIndices(
  ranges: ({ start: string; end: string } | null)[],
  foregroundColorId: string,
  foregroundRgbActive: boolean,
  paletteSize: number
): RangeIndices {
  const wholePalette: RangeIndices = { start: 0, end: paletteSize - 1, wholePalette: true };
  if (foregroundRgbActive) {
    return wholePalette;
  }
  const fg = Number(foregroundColorId);
  for (const range of ranges) {
    if (!range) {
      continue;
    }
    const low = Math.min(Number(range.start), Number(range.end));
    const high = Math.max(Number(range.start), Number(range.end));
    if (fg >= low && fg <= high) {
      return { start: low - 1, end: high - 1, wholePalette: false };
    }
  }
  return wholePalette;
}

// A contiguous span of palette slots plus its color-cycling settings.
// DPaint's Palette Window had four of these; ours defaults to six
// (MIN_RANGE_SLOTS) and grows past that when a loaded IFF carries more CRNG
// chunks — the chunk is repeatable and real files exceed four. Gradient
// Fill and the Shade/Blend/Cycle paint modes key off start/end only;
// rate/active/reverse belong to color cycling (docs/color-cycling.md).
export interface CycleRange {
  start: string; // 1-based color id, inclusive
  end: string; // 1-based color id, inclusive
  rate: number; // raw CRNG units: 16384 = 60 steps/second, 0 = holds still
  active: boolean; // participates when cycling is on
  reverse: boolean; // cycles end -> start instead of start -> end
}

export const MIN_RANGE_SLOTS = 6;
export const DEFAULT_CYCLE_RATE = 8192; // 30 steps/second

// DPaint's CRNG ranges (an IFF ILBM concept, see src/fileformat/ilbm.ts)
// become range slots (color ids are 1-based where CRNG positions are
// 0-based). Every usable chunk is kept — no cap — and the list is padded to
// the six default slots. DPaint writes unset slots as degenerate low >= high
// entries; those are dropped.
export function cycleRangesToPaletteRanges(
  cycleRanges: { low: number; high: number; rate: number; active: boolean; reverse: boolean }[]
): (CycleRange | null)[] {
  const slots: (CycleRange | null)[] = cycleRanges
    .filter((r) => r.low < r.high)
    .map((r) => ({
      start: String(r.low + 1),
      end: String(r.high + 1),
      rate: r.rate,
      active: r.active,
      reverse: r.reverse,
    }));
  while (slots.length < MIN_RANGE_SLOTS) {
    slots.push(null);
  }
  return slots;
}
