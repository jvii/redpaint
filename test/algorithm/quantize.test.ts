import { describe, expect, test } from 'vitest';
import {
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
    const data = pixels([
      ...new Array(10).fill([0, 0, 0]),
      ...new Array(90).fill([255, 0, 0]),
    ]);
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
