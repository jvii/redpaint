import { describe, expect, test } from 'vitest';
import { countDistinctColors } from '../../src/algorithm/imageColors';

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
