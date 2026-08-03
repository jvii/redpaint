import { describe, expect, test } from 'vitest';
import { CanvasColorIndex } from '../../src/domain/CanvasColorIndex';

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

  test('defaults to the top-left, growing to the right and bottom', () => {
    expect(grid(source().placedInto(3, 3, 9))).toEqual([
      [1, 2, 9],
      [3, 4, 9],
      [9, 9, 9],
    ]);
  });

  test('anchors a growth to the bottom-right', () => {
    expect(grid(source().placedInto(3, 3, 9, { x: 1, y: 1 }))).toEqual([
      [9, 9, 9],
      [9, 1, 2],
      [9, 3, 4],
    ]);
  });

  test('centers a growth, laying an even border around the artwork', () => {
    expect(grid(source().placedInto(4, 4, 9, { x: 0.5, y: 0.5 }))).toEqual([
      [9, 9, 9, 9],
      [9, 1, 2, 9],
      [9, 3, 4, 9],
      [9, 9, 9, 9],
    ]);
  });

  test('crops from the right and bottom when anchored top-left', () => {
    expect(grid(source().placedInto(1, 1, 9))).toEqual([[1]]);
  });

  test('crops from the left and top when anchored bottom-right', () => {
    expect(grid(source().placedInto(1, 1, 9, { x: 1, y: 1 }))).toEqual([[4]]);
  });

  test('crops one axis while growing the other', () => {
    expect(grid(source().placedInto(1, 3, 9, { x: 1, y: 0 }))).toEqual([[2], [4], [9]]);
  });
});
