import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';
import { TextRun } from '../../src/algorithm/glyphRaster';
import { outlineRun } from '../../src/domain/PixelFont';
import { PixelGrid } from '../pixelGrid';
import { expectMatchesFixture } from '../shapeFixture';

const HERE = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return join(HERE, '__fixtures__', 'pixelFont', `${name}.png`);
}

// Runs are built from ASCII art rather than rasterized. Rasterizing needs a
// browser that actually draws text (jsdom does not), and a system face would
// make the expectation "whatever Arial looks like on this machine" — the layout
// is the browser's job now, and what is testable here is what the app does with
// the result.
function run(rows: string[], originX = 1, baseline = 3): TextRun {
  const width = rows[0].length;
  const height = rows.length;
  const bits = new Uint8Array(width * height);
  rows.forEach((row, y): void => {
    for (let x = 0; x < width; x++) {
      if (row.charAt(x) === '@') {
        bits[y * width + x] = 1;
      }
    }
  });
  return { width, height, bits, originX, baseline };
}

function asGrid(textRun: TextRun): PixelGrid {
  return { width: textRun.width, height: textRun.height, data: textRun.bits };
}

const DOT = run(['....', '.@..', '....']);

// A stem, a ring and a diagonal: a solid run, a shape with a counter that must
// be outlined from the inside too, and edges that are neither horizontal nor
// vertical.
const SHAPES = run([
  '.............',
  '.@...@@@...@.',
  '.@...@.@..@..',
  '.@...@@@.@...',
  '.@......@....',
  '.............',
]);

describe('outlineRun', () => {
  test('grows by a pixel on every side, so the outline is never clipped', () => {
    const outlined = outlineRun(DOT);
    expect(outlined.width).toBe(DOT.width + 2);
    expect(outlined.height).toBe(DOT.height + 2);
  });

  test('moves the origins with the growth, so the text stays put', () => {
    const outlined = outlineRun(DOT);
    expect(outlined.originX).toBe(DOT.originX + 1);
    expect(outlined.baseline).toBe(DOT.baseline + 1);
  });

  test('a lone pixel outlines to the eight around it', () => {
    const outlined = outlineRun(DOT);
    expect(outlined.bits.reduce((sum, bit): number => sum + bit, 0)).toBe(8);
  });

  test('never sets a pixel the text itself occupies', () => {
    const outlined = outlineRun(SHAPES);
    for (let y = 0; y < SHAPES.height; y++) {
      for (let x = 0; x < SHAPES.width; x++) {
        if (SHAPES.bits[y * SHAPES.width + x]) {
          expect(outlined.bits[(y + 1) * outlined.width + (x + 1)]).toBe(0);
        }
      }
    }
  });

  test('outlines ink that touches the run edge', () => {
    // Ink in the corner: the outline has to appear in the grown margin rather
    // than being dropped for falling outside the original bitmap.
    const outlined = outlineRun(run(['@.', '..']));
    expect(outlined.bits[0]).toBe(1); // the new top-left corner
  });

  test('an empty run outlines to nothing', () => {
    const outlined = outlineRun(run(['..', '..']));
    expect(outlined.bits.every((bit): boolean => bit === 0)).toBe(true);
  });

  test('a zero-width run is returned untouched', () => {
    const empty: TextRun = {
      width: 0,
      height: 0,
      bits: new Uint8Array(0),
      originX: 0,
      baseline: 4,
    };
    expect(outlineRun(empty)).toEqual(empty);
  });

  test('stem, ring and diagonal', () => {
    expectMatchesFixture(asGrid(outlineRun(SHAPES)), fixture('shapes-outline'));
  });
});
