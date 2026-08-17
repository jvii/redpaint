import { describe, expect, test } from 'vitest';
import {
  BUNDLED_OUTLINE_FACES,
  BitmapFont,
  bitmapAdvance,
  bitmapMetrics,
  bitmapRun,
  bundledOutlineFace,
  parseBitmapFont,
} from '../../src/domain/BitmapFont';
import { sizesForGrid, snapSizeToGrid } from '../../src/overmind/font/state';

// A two-glyph 4x4 face: a full block at the first codepoint and a single
// top-left pixel at the second. Small enough to assert on pixel by pixel.
const CELL_WIDTH = 4;
const CELL_HEIGHT = 4;
const BASELINE = 3;
const FIRST_CODE = 0x41; // 'A'

function asset(rows: number[]): ArrayBuffer {
  const bytes = new Uint8Array(12 + rows.length);
  bytes.set([0x52, 0x50, 0x42, 0x46], 0); // 'RPBF'
  bytes[4] = 1;
  bytes[5] = CELL_WIDTH;
  bytes[6] = CELL_HEIGHT;
  bytes[7] = BASELINE;
  new DataView(bytes.buffer).setUint16(8, FIRST_CODE, true);
  new DataView(bytes.buffer).setUint16(10, rows.length / CELL_HEIGHT, true);
  bytes.set(rows, 12);
  return bytes.buffer;
}

// 'A' is solid, 'B' inks only its top-left pixel. Bits are high-bit-leftmost,
// so a 4-wide row of ink is 0xf0.
const FONT: BitmapFont = parseBitmapFont(
  'test',
  asset([0xf0, 0xf0, 0xf0, 0xf0, 0x80, 0x00, 0x00, 0x00])
);

function inked(run: { width: number; bits: Uint8Array }, x: number, y: number): number {
  return run.bits[y * run.width + x];
}

describe('parseBitmapFont', () => {
  test('reads the header', () => {
    expect(FONT.cellWidth).toBe(CELL_WIDTH);
    expect(FONT.cellHeight).toBe(CELL_HEIGHT);
    expect(FONT.baseline).toBe(BASELINE);
    expect(FONT.firstCode).toBe(FIRST_CODE);
    expect(FONT.glyphCount).toBe(2);
  });

  test('rejects a file that is not a font asset', () => {
    const bytes = new Uint8Array(12);
    expect((): unknown => parseBitmapFont('bad', bytes.buffer)).toThrow(/not a bitmap font/);
  });

  test('rejects a truncated file', () => {
    const full = new Uint8Array(asset([0xf0, 0xf0, 0xf0, 0xf0]));
    expect((): unknown => parseBitmapFont('short', full.slice(0, 14).buffer)).toThrow(/truncated/);
  });
});

describe('bitmapMetrics', () => {
  test('scales with the whole-number scale', () => {
    expect(bitmapMetrics(FONT, 1)).toEqual({ lineHeight: 4, ascent: 3, descent: 1 });
    expect(bitmapMetrics(FONT, 3)).toEqual({ lineHeight: 12, ascent: 9, descent: 3 });
  });
});

describe('bitmapAdvance', () => {
  test('is monospaced', () => {
    expect(bitmapAdvance(FONT, 1, 'AB')).toBe(8);
    expect(bitmapAdvance(FONT, 2, 'AB')).toBe(16);
    expect(bitmapAdvance(FONT, 1, '')).toBe(0);
  });
});

describe('bitmapRun', () => {
  test('an empty string produces an empty run that still knows its baseline', () => {
    const run = bitmapRun(FONT, 2, '');
    expect(run.width).toBe(0);
    expect(run.height).toBe(0);
    expect(run.baseline).toBe(BASELINE * 2);
  });

  test('lays glyphs side by side at the cell width', () => {
    const run = bitmapRun(FONT, 1, 'AB');
    expect(run.width).toBe(8);
    expect(run.height).toBe(4);
    expect(run.originX).toBe(0);
    // 'A' fills its cell
    expect(inked(run, 0, 0)).toBe(1);
    expect(inked(run, 3, 3)).toBe(1);
    // 'B' inks only its own top-left, at the second cell's origin
    expect(inked(run, 4, 0)).toBe(1);
    expect(inked(run, 5, 0)).toBe(0);
    expect(inked(run, 4, 1)).toBe(0);
  });

  test('a scaled pixel becomes a square block, never a resample', () => {
    const run = bitmapRun(FONT, 3, 'B');
    expect(run.width).toBe(12);
    expect(run.height).toBe(12);
    // the single source pixel is a solid 3x3 block and nothing else is set
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(inked(run, x, y)).toBe(1);
      }
    }
    expect(inked(run, 3, 0)).toBe(0);
    expect(inked(run, 0, 3)).toBe(0);
    expect(run.bits.reduce((sum, bit): number => sum + bit, 0)).toBe(9);
  });

  test('characters outside the face fall back to its first glyph', () => {
    // 'Z' is past the two glyphs this face has; it draws as 'A'.
    expect(bitmapRun(FONT, 1, 'Z').bits).toEqual(bitmapRun(FONT, 1, 'A').bits);
  });
});

// A bundled outline face is only crisp at whole multiples of the grid it was
// drawn on, so those are the only sizes offered — and switching to one has to
// bring the current size onto that grid, or the size control shows nothing
// selected and there is no way to tell what is in force.
describe('bundled outline faces', () => {
  test('every bundled face declares its grid', () => {
    for (const face of BUNDLED_OUTLINE_FACES) {
      expect(face.gridSize).toBeGreaterThan(0);
    }
  });

  test('offers only whole multiples of the grid', () => {
    expect(sizesForGrid(8)).toEqual([8, 16, 24, 32, 48, 64]);
    for (const size of sizesForGrid(8)) {
      expect(size % 8).toBe(0);
    }
  });

  test('snapping lands on an offered size', () => {
    for (const size of [1, 9, 10, 13, 20, 40, 100]) {
      expect(sizesForGrid(8)).toContain(snapSizeToGrid(size, 8));
    }
  });

  test('snapping picks the nearest', () => {
    expect(snapSizeToGrid(10, 8)).toBe(8);
    expect(snapSizeToGrid(14, 8)).toBe(16);
    expect(snapSizeToGrid(64, 8)).toBe(64);
  });

  test('a face already on the grid is left alone', () => {
    expect(snapSizeToGrid(16, 8)).toBe(16);
  });

  test('lookup finds a bundled face and misses an installed one', () => {
    expect(bundledOutlineFace('Silkscreen')?.gridSize).toBe(8);
    expect(bundledOutlineFace('Arial')).toBeUndefined();
  });
});
