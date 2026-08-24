import { describe, expect, test } from 'vitest';
import {
  CanvasColorIndex,
  ALPHA_INDEXED,
  ALPHA_TRUECOLOR,
} from '../../src/domain/CanvasColorIndex';

describe('toIndexedPixels', () => {
  test('is the inverse of fromIndexedPixels (top-down rows, 0-based indices)', () => {
    const indices = new Uint8Array([0, 1, 2, 3, 4, 5]); // 3x2, distinct per pixel
    const canvas = CanvasColorIndex.fromIndexedPixels(3, 2, indices);
    expect([...(canvas.toIndexedPixels() ?? [])]).toEqual([...indices]);
  });

  test('reads a painted canvas in canvas orientation', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 1);
    // paint canvas-coordinate top-left (0,0) with color number 5 (stored 0-based: 4)
    canvas.setPixel32({ x: 0, y: 0 }, CanvasColorIndex.packIndexed(5));
    const pixels = canvas.toIndexedPixels();
    expect(pixels?.[0]).toBe(4); // first byte = top-left
    expect(pixels?.[3]).toBe(0); // background color 1, stored 0-based
  });

  test('returns null when the canvas has true-color pixels', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 1);
    canvas.setPixel32(
      { x: 1, y: 1 },
      CanvasColorIndex.packPaintColor({ kind: 'rgb', color: { r: 10, g: 20, b: 30 } })
    );
    expect(canvas.toIndexedPixels()).toBeNull();
  });
});

describe('placedInto', () => {
  // A 2x2 with a distinct color number per pixel, in canvas coordinates:
  //   1 2
  //   3 4
  const source = (): CanvasColorIndex => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 9);
    canvas.setPixel32({ x: 0, y: 0 }, CanvasColorIndex.packIndexed(1));
    canvas.setPixel32({ x: 1, y: 0 }, CanvasColorIndex.packIndexed(2));
    canvas.setPixel32({ x: 0, y: 1 }, CanvasColorIndex.packIndexed(3));
    canvas.setPixel32({ x: 1, y: 1 }, CanvasColorIndex.packIndexed(4));
    return canvas;
  };

  // reads a whole canvas back as color numbers, canvas order, row by row
  const grid = (canvas: CanvasColorIndex): number[][] => {
    const rows: number[][] = [];
    for (let y = 0; y < canvas.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        row.push((canvas.getPixel32({ x, y }) & 0xff) + 1); // stored 0-based
      }
      rows.push(row);
    }
    return rows;
  };

  test('grows to the right and bottom', () => {
    expect(grid(source().placedInto(3, 3, 9))).toEqual([
      [1, 2, 9],
      [3, 4, 9],
      [9, 9, 9],
    ]);
  });

  test('crops from the right and bottom', () => {
    expect(grid(source().placedInto(1, 1, 9))).toEqual([[1]]);
  });
});

describe('mergedWith', () => {
  // reads a whole canvas back as color numbers, canvas order, row by row
  const grid = (canvas: CanvasColorIndex): number[][] => {
    const rows: number[][] = [];
    for (let y = 0; y < canvas.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        row.push(canvas.getPaintColorForPixel({ x, y }).colorNumber as number);
      }
      rows.push(row);
    }
    return rows;
  };

  // 2x2 of color 5, over a 2x2 of color 1, with 9 as the transparent color
  const filled = (width: number, height: number, color: number): CanvasColorIndex =>
    CanvasColorIndex.createEmptyWithBackgroundColor(width, height, color);

  test('paints every non-transparent pixel of the overlay', () => {
    expect(grid(filled(2, 2, 1).mergedWith(filled(2, 2, 5), 9))).toEqual([
      [5, 5],
      [5, 5],
    ]);
  });

  test('lets the base show through the overlay transparent color', () => {
    const overlay = filled(2, 2, 9); // all transparent
    overlay.setPixel32({ x: 1, y: 0 }, CanvasColorIndex.packIndexed(5));
    expect(grid(filled(2, 2, 1).mergedWith(overlay, 9))).toEqual([
      [1, 5],
      [1, 1],
    ]);
  });

  test('anchors the overlay top-left and crops what runs past the edge', () => {
    const overlay = filled(3, 3, 5);
    expect(grid(filled(2, 2, 1).mergedWith(overlay, 9))).toEqual([
      [5, 5],
      [5, 5],
    ]);
  });

  test('leaves the base alone where a smaller overlay does not reach', () => {
    const overlay = filled(1, 1, 5);
    expect(grid(filled(2, 2, 1).mergedWith(overlay, 9))).toEqual([
      [5, 1],
      [1, 1],
    ]);
  });

  test('keeps the base canvas unchanged', () => {
    const base = filled(2, 2, 1);
    base.mergedWith(filled(2, 2, 5), 9);
    expect(grid(base)).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  // A true-color pixel carries a different alpha tag, so it can never equal the
  // packed indexed background: it always paints, whatever the transparent color
  // number happens to be.
  test('never treats a true-color pixel as transparent', () => {
    const overlay = filled(1, 1, 9);
    overlay.setPixel32(
      { x: 0, y: 0 },
      CanvasColorIndex.packPaintColor({ kind: 'rgb', color: { r: 9, g: 0, b: 0 } })
    );
    const merged = filled(1, 1, 1).mergedWith(overlay, 9);
    expect(merged.getPaintColorForPixel({ x: 0, y: 0 })).toEqual({
      kind: 'rgb',
      color: { r: 9, g: 0, b: 0 },
    });
  });
});

describe('croppedTo', () => {
  // 3x3, distinct color number per pixel in canvas coordinates:
  //   1 2 3
  //   4 5 6
  //   7 8 9
  const source = (): CanvasColorIndex => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(3, 3, 1);
    let n = 1;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        canvas.setPixel32({ x, y }, CanvasColorIndex.packIndexed(n++));
      }
    }
    return canvas;
  };

  const grid = (canvas: CanvasColorIndex): number[][] => {
    const rows: number[][] = [];
    for (let y = 0; y < canvas.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        row.push((canvas.getPixel32({ x, y }) & 0xff) + 1);
      }
      rows.push(row);
    }
    return rows;
  };

  test('keeps an interior region', () => {
    expect(grid(source().croppedTo({ x: 1, y: 1, width: 2, height: 2 }, 1))).toEqual([
      [5, 6],
      [8, 9],
    ]);
  });

  test('keeps a single pixel', () => {
    expect(grid(source().croppedTo({ x: 2, y: 0, width: 1, height: 1 }, 1))).toEqual([[3]]);
  });

  test('the whole canvas is a no-op crop', () => {
    expect(grid(source().croppedTo({ x: 0, y: 0, width: 3, height: 3 }, 1))).toEqual(
      grid(source())
    );
  });
});

// One row of stored (0-based) indices, for the two color operations below.
function rowFrom(indices: number[]): CanvasColorIndex {
  const array = new Uint8Array(indices.length * 4);
  indices.forEach((index, i) => {
    array[i * 4] = index;
    array[i * 4 + 3] = ALPHA_INDEXED;
  });
  return new CanvasColorIndex(indices.length, 1, array);
}

function indicesOf(canvas: CanvasColorIndex): number[] {
  const out: number[] = [];
  for (let i = 0; i < canvas.indexArray.length; i += 4) {
    out.push(canvas.indexArray[i]);
  }
  return out;
}

describe('withColorReplaced', () => {
  test('repaints one color number as another, leaving the rest', () => {
    // color numbers are 1-based: 1 -> 4 is stored index 0 -> 3
    expect(indicesOf(rowFrom([0, 1, 0, 2]).withColorReplaced(1, 4))).toEqual([3, 1, 3, 2]);
  });

  test('leaves true-color pixels alone, having no index to match', () => {
    const canvas = rowFrom([0, 0]);
    canvas.indexArray[7] = ALPHA_TRUECOLOR;
    expect(indicesOf(canvas.withColorReplaced(1, 4))).toEqual([3, 0]);
  });

  test('does not touch the source', () => {
    const canvas = rowFrom([0, 1]);
    canvas.withColorReplaced(1, 4);
    expect(indicesOf(canvas)).toEqual([0, 1]);
  });
});

describe('withColorsSwapped', () => {
  test('exchanges two color numbers wherever either appears', () => {
    // numbers 1 and 3 are stored indices 0 and 2
    expect(indicesOf(rowFrom([0, 1, 2, 0]).withColorsSwapped(1, 3))).toEqual([2, 1, 0, 2]);
  });

  test('is its own inverse', () => {
    const there = rowFrom([0, 1, 2, 0]).withColorsSwapped(1, 3);
    expect(indicesOf(there.withColorsSwapped(1, 3))).toEqual([0, 1, 2, 0]);
  });
});
