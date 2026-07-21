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
