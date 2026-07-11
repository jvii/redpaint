import { Color } from '../types';

// Palette extraction and remapping for image loading (docs: "Image open with
// remap" in true-color-mode.md). DPaint offers no precedent to port — Amiga
// pictures were ILBM, already indexed, so it never faced a true-color source;
// its REMAP.C is a brush remap onto an existing palette (that greedy
// algorithm belongs to brush loading, later). This is the standard median
// cut:
//
//   - histogram the image in 15-bit RGB (5 bits per channel, 32k bins), so
//     the cut works on at most 32k weighted points regardless of image size;
//   - repeatedly split the box with the largest color range along its widest
//     channel at the median pixel count, until there are n boxes;
//   - each box becomes one palette color: the average of its pixels (from
//     full 8-bit sums, not bin centers).
//
// An image whose distinct colors already fit the palette skips all of this —
// its own colors are the palette, and indexing is exact (see
// extractExactPalette).

const BITS = 5;
const SHIFT = 8 - BITS;
const BINS = 1 << (BITS * 3);

type Box = {
  bins: number[]; // 15-bit bin ids belonging to this box
  pixels: number; // total pixel count
};

function binOf(r: number, g: number, b: number): number {
  return ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
}

// The palette (exactly n entries) that best covers the image, by median cut.
// Call only when the image has more distinct colors than n; otherwise use
// extractExactPalette.
export function medianCutPalette(data: Uint8ClampedArray, n: number): Color[] {
  // histogram, plus full-precision channel sums per bin for the final colors
  const counts = new Uint32Array(BINS);
  const rSum = new Float64Array(BINS);
  const gSum = new Float64Array(BINS);
  const bSum = new Float64Array(BINS);
  for (let i = 0; i < data.length; i += 4) {
    const bin = binOf(data[i], data[i + 1], data[i + 2]);
    counts[bin]++;
    rSum[bin] += data[i];
    gSum[bin] += data[i + 1];
    bSum[bin] += data[i + 2];
  }

  const allBins: number[] = [];
  let allPixels = 0;
  for (let bin = 0; bin < BINS; bin++) {
    if (counts[bin] > 0) {
      allBins.push(bin);
      allPixels += counts[bin];
    }
  }

  const channelOf = (bin: number, ch: number): number =>
    (bin >> (BITS * (2 - ch))) & ((1 << BITS) - 1);

  // the channel with the widest range in the box, and that range
  const widest = (box: Box): { ch: number; range: number } => {
    let best = { ch: 0, range: -1 };
    for (let ch = 0; ch < 3; ch++) {
      let min = 1 << BITS;
      let max = -1;
      for (const bin of box.bins) {
        const v = channelOf(bin, ch);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const range = max - min;
      if (range > best.range) best = { ch, range };
    }
    return best;
  };

  const boxes: Box[] = [{ bins: allBins, pixels: allPixels }];
  while (boxes.length < n) {
    // split the box with the widest channel range (skip unsplittable ones)
    let candidate = -1;
    let candidateRange = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].bins.length < 2) continue;
      const { range } = widest(boxes[i]);
      if (range > candidateRange) {
        candidateRange = range;
        candidate = i;
      }
    }
    if (candidate < 0) break; // every box is a single bin — nothing to split

    const box = boxes[candidate];
    const { ch } = widest(box);
    box.bins.sort((a, b) => channelOf(a, ch) - channelOf(b, ch));

    // Cut at the median pixel (not the median bin). Clamped so the right half
    // always keeps at least one bin: when a single bin holds over half the
    // pixels (a screenshot's uniform background) and sorts last on the chosen
    // channel, the accumulator never reaches half and the loop would otherwise
    // run off the end, splitting into (everything, nothing) — an empty box is
    // a NaN palette entry, and the undiminished left box wins every following
    // split, flooding the palette with them. The clamped cut instead isolates
    // the dominant bin, which is exactly the split that case wants.
    const half = box.pixels / 2;
    let acc = 0;
    let cut = 0;
    for (; cut < box.bins.length - 1; cut++) {
      acc += counts[box.bins[cut]];
      if (acc >= half) break;
    }
    cut = Math.min(cut, box.bins.length - 2);
    const leftBins = box.bins.slice(0, cut + 1);
    const rightBins = box.bins.slice(cut + 1);
    const leftPixels = leftBins.reduce((s, bin) => s + counts[bin], 0);
    boxes[candidate] = { bins: leftBins, pixels: leftPixels };
    boxes.push({ bins: rightBins, pixels: box.pixels - leftPixels });
  }

  const palette = boxes.map((box): Color => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const bin of box.bins) {
      r += rSum[bin];
      g += gSum[bin];
      b += bSum[bin];
    }
    return {
      r: Math.round(r / box.pixels),
      g: Math.round(g / box.pixels),
      b: Math.round(b / box.pixels),
    };
  });

  // fewer boxes than asked (image simpler than n): pad with black so the
  // palette is exactly n entries
  while (palette.length < n) palette.push({ r: 0, g: 0, b: 0 });
  return palette;
}

// The image's own distinct colors, in first-appearance order, padded with
// black to exactly n entries. Only valid when distinct colors <= n; indexing
// against this palette reproduces the image exactly.
export function extractExactPalette(data: Uint8ClampedArray, n: number): Color[] {
  const seen = new Set<number>();
  const palette: Color[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (!seen.has(rgb)) {
      seen.add(rgb);
      palette.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  while (palette.length < n) palette.push({ r: 0, g: 0, b: 0 });
  return palette;
}

// Maps every pixel to its palette color when the palette contains every color
// exactly (extractExactPalette). Memoized on the full 24-bit color — a per-bin
// cache would collapse distinct colors sharing a bin and break the exactness.
export function mapToPaletteExact(data: Uint8ClampedArray, palette: Color[]): Uint8Array {
  const indexByColor = new Map<number, number>();
  palette.forEach((color, index): void => {
    const rgb = (color.r << 16) | (color.g << 8) | color.b;
    if (!indexByColor.has(rgb)) indexByColor.set(rgb, index);
  });
  const indices = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    indices[p] = indexByColor.get(rgb) ?? 0;
  }
  return indices;
}

// Maps every pixel to its nearest palette color (squared RGB distance),
// returning 0-based palette positions. The search is memoized per 15-bit bin —
// pixels within a bin (8 RGB units per channel) share one answer, so a photo
// costs ~32k nearest-color searches instead of one per pixel. The error bound
// is well under quantization's own, but it is approximate: use
// mapToPaletteExact when the palette must reproduce the image verbatim.
export function mapToPalette(data: Uint8ClampedArray, palette: Color[]): Uint8Array {
  const indices = new Uint8Array(data.length / 4);
  const cache = new Int16Array(BINS).fill(-1);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const bin = binOf(r, g, b);
    let index = cache[bin];
    if (index < 0) {
      let minDist = Infinity;
      index = 0;
      for (let j = 0; j < palette.length; j++) {
        const dr = r - palette[j].r;
        const dg = g - palette[j].g;
        const db = b - palette[j].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          index = j;
        }
      }
      cache[bin] = index;
    }
    indices[p] = index;
  }
  return indices;
}
