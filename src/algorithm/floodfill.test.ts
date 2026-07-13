import { describe, expect, test } from 'vitest';
import { floodFill } from './floodfill';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { PaintColor, Point } from '../types';

function colorNumberAt(canvas: CanvasColorIndex, point: Point): number {
  const paintColor = canvas.getPaintColorForPixel(point);
  if (paintColor.kind !== 'index') {
    throw new Error('expected an indexed pixel');
  }
  return paintColor.colorNumber;
}

describe('floodFill', () => {
  test('fills a contiguous region bounded by a different color', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(5, 5, 1);
    // a wall of color 2 down the middle column splits the canvas in two
    for (let y = 0; y < 5; y++) {
      canvas.setPixel32({ x: 2, y }, CanvasColorIndex.packIndexed(2));
    }

    const fillColor: PaintColor = { kind: 'index', colorNumber: 3 };
    const filled = floodFill(fillColor, { x: 0, y: 0 }, canvas);

    expect(filled).toHaveLength(10); // the 2x5 left chamber
    expect(filled.every((p) => p.x < 2)).toBe(true);
    expect(colorNumberAt(canvas, { x: 0, y: 0 })).toBe(3);
    expect(colorNumberAt(canvas, { x: 1, y: 4 })).toBe(3);
    expect(colorNumberAt(canvas, { x: 2, y: 0 })).toBe(2); // wall untouched
    expect(colorNumberAt(canvas, { x: 4, y: 0 })).toBe(1); // right chamber untouched
  });

  test('does nothing when the fill color already matches', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(3, 3, 1);
    const fillColor: PaintColor = { kind: 'index', colorNumber: 1 };
    expect(floodFill(fillColor, { x: 1, y: 1 }, canvas)).toEqual([]);
  });

  test('derives its bounds from the given canvas, not global state', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 1);
    const fillColor: PaintColor = { kind: 'index', colorNumber: 2 };
    expect(floodFill(fillColor, { x: 0, y: 0 }, canvas)).toHaveLength(4);
  });
});
