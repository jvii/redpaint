import { Color } from '../types';

// Distinct-color census of a decoded image, used by the image load requester
// to describe what was opened ("640x512, 14,782 colors") and to spot images
// that fit a palette outright (distinct colors <= palette size), where
// indexing is exact and no quantization is needed.

// Counts the distinct 24-bit RGB colors (alpha ignored) in RGBA pixel data.
// One pass over the pixels marking a 2MB transient bitset — exact for any
// image, with no per-color allocation even for photos with millions of
// colors.
export function countDistinctColors(data: Uint8ClampedArray): number {
  const seen = new Uint8Array(1 << 21); // 2^24 colors / 8 bits per byte
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    const byte = rgb >> 3;
    const bit = 1 << (rgb & 7);
    if ((seen[byte] & bit) === 0) {
      seen[byte] |= bit;
      count++;
    }
  }
  return count;
}

// The distinct opaque colors of a decoded image (pixels at or above
// alphaThreshold — matching the cutoff BrushColorIndex.fromImageData uses to
// decide brush transparency), each with its pixel count, most frequent
// first. Used by brush loading: a brush's transparent pixels must never
// compete for a palette slot or inflate its "N colors" description, and the
// greedy remap (remapColorsGreedy) needs frequency order to assign
// high-frequency colors their own palette slot first.
export function distinctOpaqueColorsByFrequency(
  data: Uint8ClampedArray,
  alphaThreshold = 128
): { color: Color; count: number }[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < alphaThreshold) {
      continue;
    }
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([rgb, count]) => ({
      color: { r: (rgb >> 16) & 0xff, g: (rgb >> 8) & 0xff, b: rgb & 0xff },
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
