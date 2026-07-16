import { RangeIndices } from './paletteRange';

// The Cycle paint mode's color for the given stamp ordinal: walks the active
// range from its start and wraps. Returns a 0-based storage index.
export function cycleColorIndex(range: RangeIndices, step: number): number {
  const span = range.end - range.start + 1;
  return range.start + (step % span);
}
