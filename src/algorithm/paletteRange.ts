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

// DPaint's CRNG ranges (an IFF ILBM concept, see src/fileformat/ilbm.ts)
// map onto the palette's fixed four Range slots (color ids are 1-based
// where CRNG positions are 0-based). Rate and direction have no home yet —
// they return once color cycling is a feature.
export function cycleRangesToPaletteRanges(
  cycleRanges: { low: number; high: number }[]
): ({ start: string; end: string } | null)[] {
  const usable = cycleRanges.filter((r) => r.low < r.high).slice(0, 4);
  return [0, 1, 2, 3].map((i) =>
    usable[i] ? { start: String(usable[i].low + 1), end: String(usable[i].high + 1) } : null
  );
}
