import { Color } from '../types';

// Palette extraction and remapping for image loading (docs: "Image open with
// remap" in true-color-mode.md). DPaint offers no precedent to port: Amiga
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
// An image whose distinct colors already fit the palette skips all of this:
// its own colors are the palette, and indexing is exact (see
// extractExactPalette).

const BITS = 5;
const SHIFT = 8 - BITS;
const BINS = 1 << (BITS * 3);

// The 15-bit bin a color falls in, for the coarse histogram below. Nothing else
// uses it: the nearest-color lookup memoized on these bins once, and that is
// the bug documented on createNearestMapper.
function binOf(r: number, g: number, b: number): number {
  return ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
}

// One point the cut works on: pixels sharing a color, either exactly or to
// within the histogram's precision. `r`/`g`/`b` are the coordinates the cut
// sorts and measures in; the sums are always full 8-bit, so the color a box
// finally yields is a true average of its pixels rather than of bin centers.
type Cluster = {
  r: number;
  g: number;
  b: number;
  count: number;
  rSum: number;
  gSum: number;
  bSum: number;
};

// Its widest channel and that channel's range are computed once, when the box
// is made. They used to be recomputed for every box on every iteration, which
// was affordable only because the point count was capped at 32k. It is not, now
// that a box can hold every distinct color in the image.
type Box = {
  items: Cluster[];
  pixels: number;
  ch: number;
  range: number;
};

// The coarse histogram: 5 bits per channel, 32k bins, so the cut works on a
// bounded number of points however large the image.
function binnedClusters(data: Uint8ClampedArray): Cluster[] {
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

  const mask = (1 << BITS) - 1;
  const clusters: Cluster[] = [];
  for (let bin = 0; bin < BINS; bin++) {
    if (counts[bin] > 0) {
      clusters.push({
        r: (bin >> (BITS * 2)) & mask,
        g: (bin >> BITS) & mask,
        b: bin & mask,
        count: counts[bin],
        rSum: rSum[bin],
        gSum: gSum[bin],
        bSum: bSum[bin],
      });
    }
  }
  return clusters;
}

// The exact histogram: one point per distinct color, no quantization at all.
//
// Only reached when the coarse one found fewer occupied bins than the palette
// has slots, which is what makes it affordable: an image confined to under 256
// bins holds at most 256 x 512 distinct colors, so this Map is bounded by the
// very condition that asks for it. A photograph, which would make it large,
// never gets here.
function exactClusters(data: Uint8ClampedArray): Cluster[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const clusters: Cluster[] = [];
  for (const [key, count] of counts) {
    const r = key >> 16;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    clusters.push({ r, g, b, count, rSum: r * count, gSum: g * count, bSum: b * count });
  }
  return clusters;
}

function makeBox(items: Cluster[]): Box {
  let pixels = 0;
  let minR = 256;
  let maxR = -1;
  let minG = 256;
  let maxG = -1;
  let minB = 256;
  let maxB = -1;
  for (const item of items) {
    pixels += item.count;
    if (item.r < minR) minR = item.r;
    if (item.r > maxR) maxR = item.r;
    if (item.g < minG) minG = item.g;
    if (item.g > maxG) maxG = item.g;
    if (item.b < minB) minB = item.b;
    if (item.b > maxB) maxB = item.b;
  }
  let ch = 0;
  let range = maxR - minR;
  if (maxG - minG > range) {
    ch = 1;
    range = maxG - minG;
  }
  if (maxB - minB > range) {
    ch = 2;
    range = maxB - minB;
  }
  return { items, pixels, ch, range };
}

function channel(cluster: Cluster, ch: number): number {
  return ch === 0 ? cluster.r : ch === 1 ? cluster.g : cluster.b;
}

// The palette (exactly n entries) that best covers the image, by median cut.
// Call only when the image has more distinct colors than n; otherwise use
// extractExactPalette.
export function medianCutPalette(data: Uint8ClampedArray, n: number): Color[] {
  // The occupied bin count is a hard ceiling on how many boxes the cut can
  // produce, and 5-bit bins are coarse enough that ordinary pictures fall below
  // it: a smooth sky gradient of 261 distinct colors occupies 31 bins, so asking
  // for 256 gave 35 and padded the rest with black. Gradients and soft edges are
  // many colors within a narrow range, which is what collapses under
  // quantization.
  //
  // So the coarse histogram is a fast path, not the algorithm: when it cannot
  // supply enough points, the cut runs on the image's exact colors instead.
  let clusters = binnedClusters(data);
  if (clusters.length < n) {
    clusters = exactClusters(data);
  }

  const boxes: Box[] = [makeBox(clusters)];
  while (boxes.length < n) {
    // split the box with the widest channel range (skip unsplittable ones)
    let candidate = -1;
    let candidateRange = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].items.length > 1 && boxes[i].range > candidateRange) {
        candidateRange = boxes[i].range;
        candidate = i;
      }
    }
    if (candidate < 0) break; // every box is a single color — nothing to split

    const box = boxes[candidate];
    box.items.sort((a, b) => channel(a, box.ch) - channel(b, box.ch));

    // Cut at the median pixel (not the median point). Clamped so the right half
    // always keeps at least one point: when a single color holds over half the
    // pixels (a screenshot's uniform background) and sorts last on the chosen
    // channel, the accumulator never reaches half and the loop would otherwise
    // run off the end, splitting into (everything, nothing). An empty box is a
    // NaN palette entry, and the undiminished left box wins every following
    // split, flooding the palette with them. The clamped cut instead isolates
    // the dominant color, which is exactly the split that case wants.
    const half = box.pixels / 2;
    let acc = 0;
    let cut = 0;
    for (; cut < box.items.length - 1; cut++) {
      acc += box.items[cut].count;
      if (acc >= half) break;
    }
    cut = Math.min(cut, box.items.length - 2);
    boxes[candidate] = makeBox(box.items.slice(0, cut + 1));
    boxes.push(makeBox(box.items.slice(cut + 1)));
  }

  const palette = boxes.map((box): Color => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const item of box.items) {
      r += item.rSum;
      g += item.gSum;
      b += item.bSum;
    }
    return {
      r: Math.round(r / box.pixels),
      g: Math.round(g / box.pixels),
      b: Math.round(b / box.pixels),
    };
  });

  // Fewer boxes than asked, which now means the image genuinely has fewer
  // distinct colors than n. The caller was supposed to use extractExactPalette.
  // Padded with black so the palette is exactly n.
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
// exactly (extractExactPalette). Memoized on the full 24-bit color. A per-bin
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

// A nearest-palette-color lookup (squared RGB distance), exact and fast.
//
// A 15-bit bin indexes the cache, but what it caches is *candidates*, not an
// answer: answering per bin makes the result depend on which color the caller
// visited first, and memoizing per distinct color costs a full palette scan
// each, which on a photograph is a million of them.
//
// For each bin, any palette entry that could be nearest for some color anywhere
// in it is kept, and each color is measured exactly against those few. With c
// the bin's center, R the distance from c to its farthest corner and m the
// distance from c to the closest entry, the true nearest p* for any q in the
// bin satisfies
//
// dist(c, p*) <= dist(q, p*) + R <= dist(q, p_m) + R <= m + 2R
//
// so keeping everything within m + 2R cannot discard the right answer. In
// practice that is a handful of entries.
export function createNearestMapper(palette: Color[]): (r: number, g: number, b: number) => number {
  // Half a bin's extent per channel, so the corner is that far out in all three.
  const half = ((1 << SHIFT) - 1) / 2;
  const radius = Math.sqrt(3 * half * half);
  const candidates: (Int32Array | undefined)[] = new Array(BINS);

  return (r: number, g: number, b: number): number => {
    const bin = binOf(r, g, b);
    let list = candidates[bin];
    if (list === undefined) {
      const cr = ((r >> SHIFT) << SHIFT) + half;
      const cg = ((g >> SHIFT) << SHIFT) + half;
      const cb = ((b >> SHIFT) << SHIFT) + half;
      const distances = new Float64Array(palette.length);
      let nearestToCenter = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const dr = cr - palette[j].r;
        const dg = cg - palette[j].g;
        const db = cb - palette[j].b;
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        distances[j] = distance;
        if (distance < nearestToCenter) nearestToCenter = distance;
      }
      const limit = nearestToCenter + 2 * radius;
      const keep: number[] = [];
      for (let j = 0; j < palette.length; j++) {
        if (distances[j] <= limit) keep.push(j);
      }
      list = Int32Array.from(keep);
      candidates[bin] = list;
    }

    let index = list[0];
    let minDist = Infinity;
    for (let k = 0; k < list.length; k++) {
      const j = list[k];
      const dr = r - palette[j].r;
      const dg = g - palette[j].g;
      const db = b - palette[j].b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        index = j;
      }
    }
    return index;
  };
}

// Maps every pixel to its nearest palette color, returning 0-based palette
// positions (see createNearestMapper for the memoization and its error bound).
export function mapToPalette(data: Uint8ClampedArray, palette: Color[]): Uint8Array {
  const nearest = createNearestMapper(palette);
  const indices = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    indices[p] = nearest(data[i], data[i + 1], data[i + 2]);
  }
  return indices;
}

// DPaint's brush-to-palette remap (REMAP.C: BMRemapCols/BrRemapCols),
// ported. A brush typically has few distinct colors, so unlike mapToPalette's
// independent per-pixel nearest search, this assigns colors globally and
// greedily: the most frequent color first claims its nearest still-unclaimed
// palette slot, and so on down in frequency order, so two brush colors don't
// collapse onto the same slot while room remains. Once every slot is
// claimed, remaining colors fall back to nearest-any (slots become shared).
// Returns the assigned palette index per input color, same order as `colors`.
export function remapColorsGreedy(
  colors: { color: Color; count: number }[],
  palette: Color[]
): number[] {
  const distSquared = (a: Color, b: Color): number => {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
  };

  const byFrequencyDesc = colors
    .map((_, index) => index)
    .sort((a, b) => colors[b].count - colors[a].count);

  const claimed = new Array<boolean>(palette.length).fill(false);
  const assigned = new Array<number>(colors.length).fill(0);

  for (const i of byFrequencyDesc) {
    const color = colors[i].color;
    let best = -1;
    let bestDist = Infinity;
    for (let j = 0; j < palette.length; j++) {
      if (claimed[j]) continue;
      const dist = distSquared(color, palette[j]);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    if (best < 0) {
      // every slot already claimed: nearest of any, now shared
      for (let j = 0; j < palette.length; j++) {
        const dist = distSquared(color, palette[j]);
        if (dist < bestDist) {
          bestDist = dist;
          best = j;
        }
      }
    }
    claimed[best] = true;
    assigned[i] = best;
  }

  return assigned;
}
