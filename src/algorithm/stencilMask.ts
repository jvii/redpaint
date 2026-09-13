import { ALPHA_TRANSPARENT, ALPHA_TRUECOLOR, CanvasColorIndex } from '../domain/CanvasColorIndex';

// A stencil is a frozen copy of the canvas in which unprotected pixels are
// tagged ALPHA_TRANSPARENT, so one RGBA raster carries both the mask and the
// pixels to restore (docs/stencil.md). It is taken once, at Make: recoloring
// the palette leaves it intact, and pixels painted afterwards are unprotected
// until Remake retakes it.

// Whether each palette color is locked, indexed by the app's 1-based color
// number; entry 0 is unused.
export type LockedColors = boolean[];

export function isColorLocked(locked: LockedColors, colorNumber: number): boolean {
  return locked[colorNumber] === true;
}

// A true-color pixel belongs to no palette color, so no color selection can
// lock it. Lock FG, which asks whether a pixel was painted rather than what
// color it is, has its own factory.
export function stencilFromColors(
  canvas: CanvasColorIndex,
  locked: LockedColors
): CanvasColorIndex {
  return stencilFrom(canvas, (source, i) => {
    if (source[i + 3] === ALPHA_TRUECOLOR) {
      return false;
    }
    return locked[source[i] + 1] === true; // stored 0-based
  });
}

// Everything that is not the background color, whatever color it is: DPaint's
// Lock FG, which locks what has been painted since the background was fixed.
export function stencilFromPainted(
  canvas: CanvasColorIndex,
  backgroundColorNumber: number
): CanvasColorIndex {
  const background = backgroundColorNumber - 1; // stored 0-based
  return stencilFrom(
    canvas,
    (source, i) => source[i + 3] === ALPHA_TRUECOLOR || source[i] !== background
  );
}

// The same protected pixels, taken from the picture as it is now. Turning a
// stencil back on after painting through it has to do this: the mask says which
// coordinates are protected, but the pixels beside it are the ones that will be
// put back, and those went stale the moment painting was allowed through.
export function refreshedStencil(
  stencil: CanvasColorIndex,
  canvas: CanvasColorIndex
): CanvasColorIndex {
  return stencilFrom(canvas, (_source, i) => stencil.indexArray[i + 3] !== ALPHA_TRANSPARENT);
}

// Swaps protected for unprotected, retaking the pixels that were dropped from
// the canvas the stencil was made against. The canvas has to be passed back in
// because a stencil does not keep what it did not protect.
export function reversedStencil(
  stencil: CanvasColorIndex,
  canvas: CanvasColorIndex
): CanvasColorIndex {
  return stencilFrom(canvas, (_source, i) => stencil.indexArray[i + 3] === ALPHA_TRANSPARENT);
}

function stencilFrom(
  canvas: CanvasColorIndex,
  isProtected: (source: Uint8Array, i: number) => boolean
): CanvasColorIndex {
  const source = canvas.indexArray;
  const dest = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 4) {
    if (!isProtected(source, i)) {
      continue; // zero-filled: ALPHA_TRANSPARENT, nothing to restore
    }
    dest[i] = source[i];
    dest[i + 1] = source[i + 1];
    dest[i + 2] = source[i + 2];
    dest[i + 3] = source[i + 3];
  }
  return new CanvasColorIndex(canvas.width, canvas.height, dest);
}
