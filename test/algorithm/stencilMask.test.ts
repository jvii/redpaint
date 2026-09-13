import { describe, it, expect } from 'vitest';
import {
  refreshedStencil,
  reversedStencil,
  stencilFromColors,
  stencilFromPainted,
} from '../../src/algorithm/stencilMask';
import {
  ALPHA_INDEXED,
  ALPHA_TRANSPARENT,
  ALPHA_TRUECOLOR,
  CanvasColorIndex,
} from '../../src/domain/CanvasColorIndex';

// One row per test, each pixel given by its 1-based color number.
function indexed(...colorNumbers: number[]): CanvasColorIndex {
  const array = new Uint8Array(colorNumbers.length * 4);
  colorNumbers.forEach((n, i) => {
    array[i * 4] = n - 1;
    array[i * 4 + 3] = ALPHA_INDEXED;
  });
  return new CanvasColorIndex(colorNumbers.length, 1, array);
}

function trueColorAt(canvas: CanvasColorIndex, pixel: number, r: number): CanvasColorIndex {
  const array = new Uint8Array(canvas.indexArray);
  array[pixel * 4] = r;
  array[pixel * 4 + 3] = ALPHA_TRUECOLOR;
  return new CanvasColorIndex(canvas.width, canvas.height, array);
}

// Which pixels a stencil protects, as booleans.
function protectedPixels(stencil: CanvasColorIndex): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < stencil.indexArray.length; i += 4) {
    out.push(stencil.indexArray[i + 3] !== ALPHA_TRANSPARENT);
  }
  return out;
}

function colorNumbers(canvas: CanvasColorIndex): number[] {
  const out: number[] = [];
  for (let i = 0; i < canvas.indexArray.length; i += 4) {
    out.push(canvas.indexArray[i] + 1);
  }
  return out;
}

const locked = (...colorNumbers: number[]): boolean[] => {
  const flags: boolean[] = [];
  for (const n of colorNumbers) {
    flags[n] = true;
  }
  return flags;
};

describe('stencilFromColors', () => {
  it('protects the pixels holding a locked color', () => {
    const canvas = indexed(1, 2, 3, 2);
    expect(protectedPixels(stencilFromColors(canvas, locked(2)))).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it('keeps the protected pixels, so a restore has something to put back', () => {
    const stencil = stencilFromColors(indexed(1, 2, 3, 2), locked(2));
    expect(colorNumbers(stencil)).toEqual([1, 2, 1, 2]); // unprotected read 1: zeroed
    expect(protectedPixels(stencil)).toEqual([false, true, false, true]);
  });

  it('protects nothing when no color is locked', () => {
    expect(protectedPixels(stencilFromColors(indexed(1, 2, 3), locked()))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('never locks a true-color pixel, which belongs to no palette color', () => {
    // pixel 1 carries color number 2's stored byte, but is tagged true color
    const canvas = trueColorAt(indexed(1, 2, 3), 1, 1);
    expect(protectedPixels(stencilFromColors(canvas, locked(2)))).toEqual([false, false, false]);
  });
});

describe('stencilFromPainted', () => {
  it('protects everything that is not the background color', () => {
    expect(protectedPixels(stencilFromPainted(indexed(1, 2, 1, 3), 1))).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  it('protects true-color pixels, which were painted whatever their color', () => {
    const canvas = trueColorAt(indexed(1, 1, 1), 1, 0);
    expect(protectedPixels(stencilFromPainted(canvas, 1))).toEqual([false, true, false]);
  });
});

describe('reversedStencil', () => {
  it('swaps protected for unprotected', () => {
    const canvas = indexed(1, 2, 3, 2);
    const stencil = stencilFromColors(canvas, locked(2));
    expect(protectedPixels(reversedStencil(stencil, canvas))).toEqual([true, false, true, false]);
  });

  it('takes the newly protected pixels from the canvas', () => {
    const canvas = indexed(1, 2, 3, 2);
    const reversed = reversedStencil(stencilFromColors(canvas, locked(2)), canvas);
    expect(colorNumbers(reversed)).toEqual([1, 1, 3, 1]); // unprotected zeroed to 1
  });
});

describe('refreshedStencil', () => {
  it('keeps the mask and takes the pixels from the canvas as it is now', () => {
    const original = indexed(1, 2, 3, 2);
    const stencil = stencilFromColors(original, locked(2));
    // painted through while the stencil was suspended
    const painted = indexed(9, 7, 9, 7);
    const refreshed = refreshedStencil(stencil, painted);
    expect(protectedPixels(refreshed)).toEqual(protectedPixels(stencil));
    expect(colorNumbers(refreshed)).toEqual([1, 7, 1, 7]); // unprotected zeroed to 1
  });

  it('protects nothing when the stencil protected nothing', () => {
    const stencil = stencilFromColors(indexed(1, 2), locked());
    expect(protectedPixels(refreshedStencil(stencil, indexed(9, 9)))).toEqual([false, false]);
  });
});
