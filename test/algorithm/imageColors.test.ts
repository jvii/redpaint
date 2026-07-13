import { describe, expect, test } from 'vitest';
import { countDistinctColors, distinctOpaqueColorsByFrequency } from '../../src/algorithm/imageColors';

function pixels(colors: [number, number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b, a], i) => {
    data.set([r, g, b, a], i * 4);
  });
  return data;
}

describe('countDistinctColors', () => {
  test('a single repeated color counts as one', () => {
    const data = pixels([
      [10, 20, 30, 255],
      [10, 20, 30, 255],
      [10, 20, 30, 255],
    ]);
    expect(countDistinctColors(data)).toBe(1);
  });

  test('every distinct color is counted', () => {
    const data = pixels([
      [0, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]);
    expect(countDistinctColors(data)).toBe(4);
  });

  test('alpha is ignored — same RGB with different alpha counts once', () => {
    const data = pixels([
      [10, 20, 30, 255],
      [10, 20, 30, 0],
      [10, 20, 30, 128],
    ]);
    expect(countDistinctColors(data)).toBe(1);
  });
});

describe('distinctOpaqueColorsByFrequency', () => {
  test('excludes pixels below the alpha threshold entirely', () => {
    const data = pixels([
      [255, 0, 0, 255], // opaque
      [0, 255, 0, 100], // transparent (below default threshold 128)
      [0, 0, 255, 127], // transparent (just below)
    ]);
    const result = distinctOpaqueColorsByFrequency(data);
    expect(result).toEqual([{ color: { r: 255, g: 0, b: 0 }, count: 1 }]);
  });

  test('alpha exactly at the threshold counts as opaque', () => {
    const data = pixels([[10, 20, 30, 128]]);
    expect(distinctOpaqueColorsByFrequency(data)).toEqual([
      { color: { r: 10, g: 20, b: 30 }, count: 1 },
    ]);
  });

  test('counts occurrences and sorts most frequent first', () => {
    const data = pixels([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    expect(distinctOpaqueColorsByFrequency(data)).toEqual([
      { color: { r: 0, g: 0, b: 0 }, count: 3 },
      { color: { r: 255, g: 255, b: 255 }, count: 2 },
    ]);
  });

  test('a custom alphaThreshold is respected', () => {
    const data = pixels([[10, 20, 30, 200]]);
    expect(distinctOpaqueColorsByFrequency(data, 255)).toEqual([]);
  });
});
