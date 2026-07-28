import { describe, expect, test } from 'vitest';
import { bucketPointsByPattern, patternColorAt } from '../../src/algorithm/patternFill';
import { BrushColorIndex } from '../../src/domain/BrushColorIndex';
import { ALPHA_TRANSPARENT } from '../../src/domain/CanvasColorIndex';

// Builds a BrushColorIndex from a top-down grid of 1-based color numbers (0
// = transparent), flipping to the class's own bottom-up row storage —
// mirroring how BrushColorIndex.fromImageData builds from top-down source
// pixels.
function buildPattern(rows: number[][]): BrushColorIndex {
  const height = rows.length;
  const width = rows[0].length;
  const indexArray = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const targetRow = (height - y - 1) * width * 4;
    for (let x = 0; x < width; x++) {
      const colorNumber = rows[y][x];
      if (colorNumber === 0) {
        continue; // stays all-zero: transparent
      }
      indexArray[targetRow + x * 4] = colorNumber - 1;
      indexArray[targetRow + x * 4 + 3] = 127; // ALPHA_INDEXED
    }
  }
  return new BrushColorIndex(width, height, indexArray);
}

describe('patternColorAt', () => {
  test('maps (x, y) to the pattern pixel at that position, top-down as authored', () => {
    const pattern = buildPattern([
      [1, 2],
      [3, 4],
    ]);
    expect(patternColorAt(pattern, 0, 0)).toBe(1);
    expect(patternColorAt(pattern, 1, 0)).toBe(2);
    expect(patternColorAt(pattern, 0, 1)).toBe(3);
    expect(patternColorAt(pattern, 1, 1)).toBe(4);
  });

  test('tiles by wrapping both axes at the pattern bounds', () => {
    const pattern = buildPattern([
      [1, 2],
      [3, 4],
    ]);
    expect(patternColorAt(pattern, 2, 0)).toBe(1);
    expect(patternColorAt(pattern, 3, 1)).toBe(4);
    expect(patternColorAt(pattern, 0, 2)).toBe(1);
    expect(patternColorAt(pattern, 4, 4)).toBe(1);
  });

  test('wraps negative coordinates to the same tile, not the JS % sign', () => {
    const pattern = buildPattern([
      [1, 2],
      [3, 4],
    ]);
    expect(patternColorAt(pattern, -1, 0)).toBe(2);
    expect(patternColorAt(pattern, 0, -1)).toBe(3);
    expect(patternColorAt(pattern, -1, -1)).toBe(4);
  });

  test('a transparent pattern pixel returns null', () => {
    const pattern = buildPattern([
      [1, 0],
      [0, 4],
    ]);
    expect(patternColorAt(pattern, 1, 0)).toBeNull();
    expect(patternColorAt(pattern, 0, 1)).toBeNull();
    expect(patternColorAt(pattern, 0, 0)).toBe(1);
  });

  test('a true-color (non-indexed) pattern pixel is treated as transparent', () => {
    const pattern = buildPattern([[1]]);
    pattern.indexArray[3] = 255; // ALPHA_TRUECOLOR, not ALPHA_INDEXED
    expect(patternColorAt(pattern, 0, 0)).toBeNull();
  });
});

describe('bucketPointsByPattern', () => {
  test('buckets points by the pattern pixel they land on', () => {
    const pattern = buildPattern([
      [1, 2],
      [3, 4],
    ]);
    const points = [
      { x: 0, y: 0 },
      { x: 2, y: 0 }, // wraps to the same tile pixel as (0,0)
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    const buckets = bucketPointsByPattern(points, pattern);
    expect(Object.fromEntries(buckets)).toEqual({
      1: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      2: [{ x: 1, y: 0 }],
      3: [{ x: 0, y: 1 }],
      4: [{ x: 1, y: 1 }],
    });
  });

  test('drops points that land on a transparent pattern pixel', () => {
    const pattern = buildPattern([[1, 0]]);
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const buckets = bucketPointsByPattern(points, pattern);
    expect(Object.fromEntries(buckets)).toEqual({ 1: [{ x: 0, y: 0 }] });
  });
});

// sanity: the transparency tag this file relies on is really 0
test('ALPHA_TRANSPARENT is 0 (a freshly zeroed pattern pixel is transparent)', () => {
  expect(ALPHA_TRANSPARENT).toBe(0);
});
