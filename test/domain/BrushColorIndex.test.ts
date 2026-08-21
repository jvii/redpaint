import { describe, expect, test } from 'vitest';
import { BrushColorIndex } from '../../src/domain/BrushColorIndex';
import {
  ALPHA_INDEXED,
  ALPHA_TRANSPARENT,
  ALPHA_TRUECOLOR,
} from '../../src/domain/CanvasColorIndex';

// One pixel per entry: [storedIndex, _, _, alphaTag]
function pixels(entries: [number, number][]): Uint8Array {
  const data = new Uint8Array(entries.length * 4);
  entries.forEach(([index, tag], i): void => {
    data[i * 4] = index;
    data[i * 4 + 3] = tag;
  });
  return data;
}

const tagsOf = (brush: BrushColorIndex): number[] =>
  Array.from(brush.indexArray.filter((_, i): boolean => i % 4 === 3));

describe('transparent color', () => {
  test('tags the pixels holding it and remembers which color it was', () => {
    // color number 2 is 1-based, so stored index 1
    const brush = new BrushColorIndex(
      3,
      1,
      pixels([
        [0, ALPHA_INDEXED],
        [1, ALPHA_INDEXED],
        [2, ALPHA_INDEXED],
      ]),
      2
    );
    expect(tagsOf(brush)).toEqual([ALPHA_INDEXED, ALPHA_TRANSPARENT, ALPHA_INDEXED]);
    expect(brush.transparentColorNumber).toBe(2);
  });

  test('color number 1 is a real choice, not "none"', () => {
    const brush = new BrushColorIndex(1, 1, pixels([[0, ALPHA_INDEXED]]), 1);
    expect(tagsOf(brush)).toEqual([ALPHA_TRANSPARENT]);
    expect(brush.transparentColorNumber).toBe(1);
  });

  test('is undefined when transparency did not come from a color', () => {
    const brush = new BrushColorIndex(1, 1, pixels([[0, ALPHA_TRANSPARENT]]));
    expect(brush.transparentColorNumber).toBeUndefined();
  });

  test('never tags a true-color pixel, whatever it holds', () => {
    const brush = new BrushColorIndex(1, 1, pixels([[1, ALPHA_TRUECOLOR]]), 2);
    expect(tagsOf(brush)).toEqual([ALPHA_TRUECOLOR]);
  });
});

describe('derive', () => {
  test('carries the transparent color onto a reshaped bitmap', () => {
    const brush = new BrushColorIndex(1, 1, pixels([[1, ALPHA_INDEXED]]), 2);
    const derived = brush.derive(1, 1, pixels([[0, ALPHA_INDEXED]]));
    expect(derived.transparentColorNumber).toBe(2);
  });

  test('does not re-tag pixels that now hold the transparent color', () => {
    // A transform can bring in pixels of that color — a stretch repeating an
    // edge, a rotate filling a corner. They are new opaque pixels, not holes,
    // and re-running addTransparency on them would punch the brush through.
    const brush = new BrushColorIndex(1, 1, pixels([[1, ALPHA_INDEXED]]), 2);
    const derived = brush.derive(
      2,
      1,
      pixels([
        [1, ALPHA_INDEXED],
        [1, ALPHA_INDEXED],
      ])
    );
    expect(tagsOf(derived)).toEqual([ALPHA_INDEXED, ALPHA_INDEXED]);
  });
});

describe('toIndexedPixels', () => {
  // rows are stored bottom-up, so this builds them in that order
  const brushFrom = (rows: [number, number][][], transparent?: number): BrushColorIndex =>
    new BrushColorIndex(
      rows[0].length,
      rows.length,
      pixels(rows.slice().reverse().flat()),
      transparent
    );

  test('reads rows top-down, whatever order they are stored in', () => {
    const brush = brushFrom([
      [
        [1, ALPHA_INDEXED],
        [2, ALPHA_INDEXED],
      ],
      [
        [3, ALPHA_INDEXED],
        [4, ALPHA_INDEXED],
      ],
    ]);
    expect(Array.from(brush.toIndexedPixels()!.pixels)).toEqual([1, 2, 3, 4]);
  });

  test('writes holes as the color they were made from, not the zero left in them', () => {
    // color number 3 -> stored index 2; the middle pixel becomes a hole
    const brush = brushFrom(
      [
        [
          [1, ALPHA_INDEXED],
          [2, ALPHA_INDEXED],
          [5, ALPHA_INDEXED],
        ],
      ],
      3
    );
    const indexed = brush.toIndexedPixels()!;
    expect(Array.from(indexed.pixels)).toEqual([1, 2, 5]);
    expect(indexed.transparentColor).toBe(2);
  });

  test('refuses a brush with true-color pixels', () => {
    expect(brushFrom([[[1, ALPHA_TRUECOLOR]]]).toIndexedPixels()).toBeNull();
  });

  test('takes a transparent index for a brush whose holes came from alpha', () => {
    const brush = brushFrom([
      [
        [0, ALPHA_TRANSPARENT],
        [1, ALPHA_INDEXED],
      ],
    ]);
    expect(Array.from(brush.toIndexedPixels(7)!.pixels)).toEqual([7, 1]);
    expect(brush.toIndexedPixels(7)!.transparentColor).toBe(7);
  });

  test('refuses holes it has no index for', () => {
    const brush = brushFrom([[[0, ALPHA_TRANSPARENT]]]);
    expect(brush.toIndexedPixels()).toBeNull();
  });
});
