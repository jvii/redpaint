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
