import { describe, expect, test } from 'vitest';
import {
  backgroundToForeground,
  swapBackgroundAndForeground,
  remapToPalette,
  hasTrueColorPixels,
} from '../../src/algorithm/brushRecolor';
import { BrushColorIndex } from '../../src/domain/BrushColorIndex';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR } from '../../src/domain/CanvasColorIndex';

// A brush from visual rows, '.' a hole and a digit a stored (0-based) index.
// Rows are given top-first and flipped into the array's bottom-up order.
function brushFrom(rows: string[], transparentColorNumber?: number): BrushColorIndex {
  const width = rows[0].length;
  const height = rows.length;
  const indexArray = new Uint8Array(width * height * 4);
  rows.forEach((row, visualY) => {
    const y = height - visualY - 1;
    for (let x = 0; x < width; x++) {
      const char = row.charAt(x);
      if (char !== '.') {
        indexArray[(y * width + x) * 4] = Number(char);
        indexArray[(y * width + x) * 4 + 3] = ALPHA_INDEXED;
      }
    }
  });
  const brush = new BrushColorIndex(width, height, indexArray);
  brush.transparentColorNumber = transparentColorNumber;
  return brush;
}

// The inverse, so assertions read as pictures.
function rowsOf(brush: BrushColorIndex): string[] {
  const rows: string[] = [];
  for (let visualY = 0; visualY < brush.height; visualY++) {
    const y = brush.height - visualY - 1;
    let row = '';
    for (let x = 0; x < brush.width; x++) {
      const offset = (y * brush.width + x) * 4;
      row += brush.indexArray[offset + 3] === ALPHA_INDEXED ? String(brush.indexArray[offset]) : '.';
    }
    rows.push(row);
  }
  return rows;
}

describe('backgroundToForeground', () => {
  test('fills the holes with the foreground color and leaves the rest', () => {
    const brush = brushFrom(['.1.', '12.', '..3'], 5);
    // foreground is color number 8, stored as index 7
    expect(rowsOf(backgroundToForeground(brush, 8))).toEqual(['717', '127', '773']);
  });

  test('leaves no transparent color, there being no holes left', () => {
    expect(backgroundToForeground(brushFrom(['.1'], 5), 8).transparentColorNumber).toBeUndefined();
  });

  test('does not touch the source', () => {
    const brush = brushFrom(['.1'], 5);
    backgroundToForeground(brush, 8);
    expect(rowsOf(brush)).toEqual(['.1']);
  });
});

describe('swapBackgroundAndForeground', () => {
  test('holes take the foreground color and its pixels become holes', () => {
    // foreground is color number 2, stored as index 1
    const brush = brushFrom(['.1.', '12.', '..3'], 5);
    expect(rowsOf(swapBackgroundAndForeground(brush, 2))).toEqual(['1.1', '.21', '113']);
  });

  test('names the holes by the color that just made them', () => {
    expect(swapBackgroundAndForeground(brushFrom(['.1'], 5), 2).transparentColorNumber).toBe(2);
  });

  test('is its own inverse on a brush holding both', () => {
    const brush = brushFrom(['.1.', '12.'], 5);
    const there = swapBackgroundAndForeground(brush, 2);
    expect(rowsOf(swapBackgroundAndForeground(there, 2))).toEqual(['.1.', '12.']);
  });
});

describe('remapToPalette', () => {
  const from = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
  ];

  test('re-indexes each pixel onto the nearest entry of the new palette', () => {
    // the new palette holds the same colors in a different order
    const to = [
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
    ];
    expect(rowsOf(remapToPalette(brushFrom(['012']), from, to))).toEqual(['120']);
  });

  test('moves the transparent color with them', () => {
    const to = [
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
    ];
    // color number 2 is index 1, red, which lands on index 2 — number 3
    expect(remapToPalette(brushFrom(['012'], 2), from, to).transparentColorNumber).toBe(3);
  });

  test('gives the most-used color first claim on a slot', () => {
    // Two reds competing for the same nearest entry. Whichever covers more of
    // the brush is assigned first and takes it; the other is pushed onto the
    // second entry only while that is close enough to be worth it, which is the
    // tolerance guard remapColorsGreedy applies (see quantize.ts).
    const reds = [
      { r: 255, g: 0, b: 0 }, // near entry 0 and far from entry 1
      { r: 230, g: 0, b: 0 }, // equidistant between them
    ];
    const to = [
      { r: 250, g: 0, b: 0 },
      { r: 210, g: 0, b: 0 },
    ];
    // color 0 covers three pixels: it takes entry 0, and color 1 is content
    // with entry 1, which is just as near
    expect(rowsOf(remapToPalette(brushFrom(['0001']), reds, to))).toEqual(['0001']);
    // the other way round, color 1 goes first and takes entry 0 — and now color
    // 0 will not be pushed onto entry 1, which is far enough to be worse than
    // sharing
    expect(rowsOf(remapToPalette(brushFrom(['1110']), reds, to))).toEqual(['0000']);
  });
});

describe('hasTrueColorPixels', () => {
  test('finds one', () => {
    const brush = brushFrom(['12']);
    brush.indexArray[3] = ALPHA_TRUECOLOR;
    expect(hasTrueColorPixels(brush)).toBe(true);
  });

  test('and says so when there are none', () => {
    expect(hasTrueColorPixels(brushFrom(['.12']))).toBe(false);
  });
});
