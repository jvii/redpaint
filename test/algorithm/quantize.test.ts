import { describe, expect, test } from 'vitest';
import { Color } from '../../src/types';
import {
  createNearestMapper,
  extractExactPalette,
  mapToPalette,
  mapToPaletteExact,
  medianCutPalette,
  remapColorsGreedy,
} from '../../src/algorithm/quantize';

function pixels(colors: [number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b], i) => {
    data.set([r, g, b, 255], i * 4);
  });
  return data;
}

describe('extractExactPalette', () => {
  test('returns distinct colors in first-appearance order, padded to n', () => {
    const data = pixels([
      [10, 20, 30],
      [40, 50, 60],
      [10, 20, 30],
    ]);
    expect(extractExactPalette(data, 4)).toEqual([
      { r: 10, g: 20, b: 30 },
      { r: 40, g: 50, b: 60 },
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
    ]);
  });
});

describe('mapToPaletteExact', () => {
  test('maps every pixel back to its own exact palette entry', () => {
    const data = pixels([
      [10, 20, 30],
      [40, 50, 60],
      [40, 50, 60],
      [10, 20, 30],
    ]);
    const palette = extractExactPalette(data, 2);
    const indices = mapToPaletteExact(data, palette);
    expect(Array.from(indices)).toEqual([0, 1, 1, 0]);
  });
});

describe('mapToPalette (nearest color)', () => {
  test('assigns each pixel to its nearest palette entry', () => {
    const palette = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ];
    const data = pixels([
      [10, 10, 10],
      [250, 250, 250],
      [0, 0, 0],
    ]);
    const indices = mapToPalette(data, palette);
    expect(Array.from(indices)).toEqual([0, 1, 0]);
  });
});

describe('medianCutPalette', () => {
  test('a single dominant color with no splittable box is not padded with NaN', () => {
    const data = pixels(new Array(20).fill([10, 20, 30]));
    const palette = medianCutPalette(data, 8);
    expect(palette).toHaveLength(8);
    expect(palette[0]).toEqual({ r: 10, g: 20, b: 30 });
    for (const color of palette.slice(1)) {
      expect(color).toEqual({ r: 0, g: 0, b: 0 });
    }
  });

  // Regression test for a real bug: a box where one bin holds the large
  // majority of pixels and sorts last on the widest channel used to run the
  // median-pixel cut off the end of the bin list, producing an empty box and
  // a NaN palette entry (0/0 average). See the "Clamped so the right half..."
  // comment in quantize.ts for the fix.
  test('a heavily dominant color does not produce NaN palette entries', () => {
    const data = pixels([...new Array(10).fill([0, 0, 0]), ...new Array(90).fill([255, 0, 0])]);
    const palette = medianCutPalette(data, 2);

    expect(palette).toHaveLength(2);
    for (const color of palette) {
      expect(Number.isFinite(color.r)).toBe(true);
      expect(Number.isFinite(color.g)).toBe(true);
      expect(Number.isFinite(color.b)).toBe(true);
    }
    expect(palette).toContainEqual({ r: 0, g: 0, b: 0 });
    expect(palette).toContainEqual({ r: 255, g: 0, b: 0 });
  });

  test('pads the palette with black when the image has fewer distinct colors than n', () => {
    const data = pixels([
      [10, 20, 30],
      [40, 50, 60],
    ]);
    const palette = medianCutPalette(data, 4);
    expect(palette).toHaveLength(4);
  });
});

describe('remapColorsGreedy', () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };

  test('more source colors than palette slots: high-frequency colors claim a slot first', () => {
    // 3 colors competing for 2 slots — the most-frequent two (near-black,
    // near-white) should each get their own slot; the least-frequent
    // (mid-gray) only gets a look-in once both are already claimed, and
    // ends up sharing whichever slot is nearest (white, by a hair)
    const colors = [
      { color: { r: 10, g: 10, b: 10 }, count: 100 }, // near-black
      { color: { r: 245, g: 245, b: 245 }, count: 50 }, // near-white
      { color: { r: 128, g: 128, b: 128 }, count: 10 }, // mid-gray
    ];
    const assigned = remapColorsGreedy(colors, [black, white]);
    expect(assigned[0]).toBe(0); // near-black -> black
    expect(assigned[1]).toBe(1); // near-white -> white
    expect(assigned[2]).toBe(1); // mid-gray falls back, nearest is white
  });

  test('fewer source colors than palette slots: every color gets a unique slot', () => {
    const red = { r: 255, g: 0, b: 0 };
    const blue = { r: 0, g: 0, b: 255 };
    const colors = [
      { color: { r: 250, g: 5, b: 5 }, count: 5 }, // reddish
      { color: { r: 5, g: 5, b: 250 }, count: 3 }, // bluish
    ];
    const assigned = remapColorsGreedy(colors, [black, white, red, blue]);
    expect(assigned[0]).toBe(2); // reddish -> red
    expect(assigned[1]).toBe(3); // bluish -> blue
    expect(assigned[0]).not.toBe(assigned[1]);
  });

  test('returns assignments in the same order as the input colors, not frequency order', () => {
    const colors = [
      { color: { r: 245, g: 245, b: 245 }, count: 1 }, // least frequent, listed first
      { color: { r: 10, g: 10, b: 10 }, count: 100 }, // most frequent, listed second
    ];
    const assigned = remapColorsGreedy(colors, [black, white]);
    expect(assigned[0]).toBe(1); // near-white
    expect(assigned[1]).toBe(0); // near-black
  });
});

// A palette of n colors should be n *usable* colors. The coarse 5-bit
// histogram cannot supply more points than it has occupied bins, and a picture
// can easily have more distinct colors than bins — which is the shape anything
// painted in True Color takes, since gradients and soft edges are many colors
// within a narrow range.
describe('medianCutPalette on colors packed into few bins', () => {
  // 600 steps over these ranges gives 261 distinct colors — the channels climb
  // by 60, 120 and 80, and the triple changes on each of those increments — all
  // inside a range that collapses to 31 bins at 5 bits per channel. Asking for
  // 256 returned 35 usable colors and 221 black.
  function gradient(steps: number): Uint8ClampedArray {
    const colors: [number, number, number][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      colors.push([Math.round(20 + t * 60), Math.round(60 + t * 120), Math.round(160 + t * 80)]);
    }
    return pixels(colors);
  }

  function distinct(palette: { r: number; g: number; b: number }[]): number {
    return new Set(palette.map((c) => `${c.r},${c.g},${c.b}`)).size;
  }

  test('fills the palette instead of padding it with black', () => {
    const palette = medianCutPalette(gradient(600), 256);
    expect(distinct(palette)).toBe(256);
    expect(palette.filter((c) => c.r === 0 && c.g === 0 && c.b === 0)).toHaveLength(0);
  });

  test('every color it picks is inside the picture own range', () => {
    for (const color of medianCutPalette(gradient(600), 256)) {
      expect(color.r).toBeGreaterThanOrEqual(20);
      expect(color.r).toBeLessThanOrEqual(80);
      expect(color.g).toBeGreaterThanOrEqual(60);
      expect(color.g).toBeLessThanOrEqual(180);
      expect(color.b).toBeGreaterThanOrEqual(160);
      expect(color.b).toBeLessThanOrEqual(240);
    }
  });

  // The near-miss that made this visible: barely more colors than slots, so
  // extractExactPalette is skipped and the cut has to do the work.
  test('handles one color more than the palette holds', () => {
    const colors: [number, number, number][] = [];
    for (let i = 0; i < 257; i++) {
      colors.push([100 + (i % 8), 100 + ((i >> 3) % 8), 100 + ((i >> 6) % 8)]);
    }
    expect(distinct(medianCutPalette(pixels(colors), 256))).toBeGreaterThanOrEqual(255);
  });

  // The coarse histogram still handles a picture that spreads out, and is
  // still what runs for one — the exact fallback is only for the narrow case.
  test('a wide-gamut picture still fills the palette', () => {
    const colors: [number, number, number][] = [];
    for (let r = 0; r < 256; r += 8) {
      for (let g = 0; g < 256; g += 8) {
        colors.push([r, g, (r + g) >> 1]);
      }
    }
    const palette = medianCutPalette(pixels(colors), 256);
    expect(distinct(palette)).toBe(256);
  });
});

// The nearest lookup is indexed by 15-bit bin but must not *answer* per bin:
// it caches which palette entries could win anywhere in that bin and then
// measures each color exactly. These check that the shortcut never changes the
// answer, because when it did, the result depended on the caller's scan order.
describe('createNearestMapper', () => {
  function bruteForce(palette: Color[], r: number, g: number, b: number): number {
    let best = 0;
    let bestDist = Infinity;
    palette.forEach((color, j) => {
      const dist = (r - color.r) ** 2 + (g - color.g) ** 2 + (b - color.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    });
    return best;
  }

  // A deterministic spread of palettes and colors, including the dark clusters
  // that made the old per-bin answer visibly wrong.
  function randoms(seed: number, count: number, max: number): number[] {
    const out: number[] = [];
    let s = seed;
    for (let i = 0; i < count; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      out.push((s >>> 9) % max);
    }
    return out;
  }

  test.each([
    ['a palette spread over the whole cube', 256, 256],
    ['a palette packed into the darks', 256, 24],
    ['a tiny palette', 4, 256],
    ['two colors one unit apart', 2, 2],
  ])('agrees with a brute-force search: %s', (_label, size, spread) => {
    const channels = randoms(size * 7 + spread, size * 3, spread);
    const palette: Color[] = [];
    for (let i = 0; i < size; i++) {
      palette.push({ r: channels[i * 3], g: channels[i * 3 + 1], b: channels[i * 3 + 2] });
    }
    const nearest = createNearestMapper(palette);
    const probes = randoms(99, 1500, 256);
    for (let i = 0; i + 2 < probes.length; i += 3) {
      const [r, g, b] = [probes[i], probes[i + 1], probes[i + 2]];
      expect(nearest(r, g, b)).toBe(bruteForce(palette, r, g, b));
    }
  });

  // The specific failure: two colors in one bin (all channels under 8) whose
  // nearest entries differ. Querying one first used to decide for the other.
  test('does not let one color in a bin answer for another', () => {
    const palette: Color[] = [
      { r: 1, g: 1, b: 1 },
      { r: 12, g: 12, b: 11 },
      { r: 200, g: 200, b: 200 },
    ];
    const seededDark = createNearestMapper(palette);
    expect(seededDark(0, 0, 0)).toBe(0);
    expect(seededDark(7, 7, 7)).toBe(1);

    // and in the other order, which is what changed between the two paths
    const seededLight = createNearestMapper(palette);
    expect(seededLight(7, 7, 7)).toBe(1);
    expect(seededLight(0, 0, 0)).toBe(0);
  });

  test('is independent of the order colors are asked about', () => {
    const palette: Color[] = randoms(4242, 256 * 3, 40).reduce<Color[]>((acc, _v, i, arr) => {
      if (i % 3 === 0) acc.push({ r: arr[i], g: arr[i + 1], b: arr[i + 2] });
      return acc;
    }, []);
    const probes = randoms(7, 900, 48);
    const forward = createNearestMapper(palette);
    const backward = createNearestMapper(palette);
    const results: number[] = [];
    for (let i = 0; i + 2 < probes.length; i += 3) {
      results.push(forward(probes[i], probes[i + 1], probes[i + 2]));
    }
    for (
      let i = probes.length - (probes.length % 3) - 3, k = results.length - 1;
      i >= 0;
      i -= 3, k--
    ) {
      expect(backward(probes[i], probes[i + 1], probes[i + 2])).toBe(results[k]);
    }
  });
});
