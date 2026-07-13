import { describe, expect, test } from 'vitest';
import {
  extractExactPalette,
  mapToPalette,
  mapToPaletteExact,
  medianCutPalette,
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
