import { BrushColorIndex } from '../domain/BrushColorIndex';
import { ALPHA_INDEXED, ALPHA_TRANSPARENT, ALPHA_TRUECOLOR } from '../domain/CanvasColorIndex';
import { Color } from '../types';
import { remapColorsGreedy } from './quantize';

// DPaint's Brush > Change Color (docs/brush-palette.md): the operations that
// recolor a brush's pixels rather than reshaping them, as brushTransform.ts
// does. Pure, like everything here — a new BrushColorIndex out, the source
// untouched.
//
// A brush's holes and its background color are the same pixels: capture tags
// every pixel holding the background color as transparent (BrushColorIndex's
// addTransparency) and zeroes the index, which is what DPaint's mask against
// curxpc amounts to. So "the background color" below means the holes.

const STRIDE = 4;

// Bg -> Fg (BrBgToFg, BRXFORM.C:77). Paints the holes in the foreground color,
// leaving a brush with none — DPaint rebuilds the mask afterwards and nothing
// holds the transparent color any more.
//
// Note this is the opposite end from Color mode, which recolors the *opaque*
// pixels and leaves the holes alone.
export function backgroundToForeground(
  brush: BrushColorIndex,
  foregroundColorNumber: number
): BrushColorIndex {
  const result = new Uint8Array(brush.indexArray);
  for (let i = 0; i < result.length; i += STRIDE) {
    if (result[i + STRIDE - 1] === ALPHA_TRANSPARENT) {
      result[i] = foregroundColorNumber - 1; // stored 0-based
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = ALPHA_INDEXED;
    }
  }
  // No holes left, so nothing names them.
  return withTransparentColor(brush.derive(brush.width, brush.height, result), undefined);
}

// Bg <-> Fg, DPaint II's third item. The swap: holes take the foreground color
// and the foreground-colored pixels become holes. True-color pixels hold no
// index to compare, so they are left alone.
export function swapBackgroundAndForeground(
  brush: BrushColorIndex,
  foregroundColorNumber: number
): BrushColorIndex {
  const result = new Uint8Array(brush.indexArray);
  const foregroundIndex = foregroundColorNumber - 1;
  for (let i = 0; i < result.length; i += STRIDE) {
    const tag = result[i + STRIDE - 1];
    if (tag === ALPHA_TRANSPARENT) {
      result[i] = foregroundIndex;
      result[i + 3] = ALPHA_INDEXED;
    } else if (tag === ALPHA_INDEXED && result[i] === foregroundIndex) {
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;
      result[i + 3] = ALPHA_TRANSPARENT;
    }
  }
  // The holes are now what the foreground color used to be, so that is the
  // color naming them.
  return withTransparentColor(
    brush.derive(brush.width, brush.height, result),
    foregroundColorNumber
  );
}

// Remap (BrRemapCols, REMAP.C:159): re-index the brush from the palette its
// indices mean into the current one, so it keeps its colors rather than its
// slots. The same greedy exclusive assignment brush loading uses, which is
// DPaint's own (REMAP.C's `used` bitmask): each source color takes the nearest
// palette entry not already claimed, most-used color first.
//
// Weighted by how much of the brush each color actually covers, so a color
// holding one pixel cannot take the slot a color holding half the brush wants.
// Colors the brush does not use score zero and are assigned last, which costs
// nothing — no pixel refers to them.
export function remapToPalette(
  brush: BrushColorIndex,
  from: Color[],
  to: Color[]
): BrushColorIndex {
  const counts = new Array<number>(from.length).fill(0);
  for (let i = 0; i < brush.indexArray.length; i += STRIDE) {
    if (brush.indexArray[i + STRIDE - 1] === ALPHA_INDEXED) {
      const index = brush.indexArray[i];
      if (index < counts.length) {
        counts[index]++;
      }
    }
  }
  const mapping = remapColorsGreedy(
    from.map((color, index) => ({ color, count: counts[index] })),
    to
  );

  const result = new Uint8Array(brush.indexArray);
  for (let i = 0; i < result.length; i += STRIDE) {
    if (result[i + STRIDE - 1] === ALPHA_INDEXED && result[i] < mapping.length) {
      result[i] = mapping[result[i]];
    }
  }
  // The holes keep their tag either way; what changes is which color names
  // them, since that number is an index into the palette that just moved.
  const wasTransparent = brush.transparentColorNumber;
  const nowTransparent =
    wasTransparent !== undefined && wasTransparent - 1 < mapping.length
      ? mapping[wasTransparent - 1] + 1
      : undefined;
  return withTransparentColor(brush.derive(brush.width, brush.height, result), nowTransparent);
}

// derive() carries the source's transparent color, which these three all
// change. Set after the fact rather than through the constructor, which would
// re-run addTransparency over pixels already tagged.
function withTransparentColor(
  brush: BrushColorIndex,
  colorNumber: number | undefined
): BrushColorIndex {
  brush.transparentColorNumber = colorNumber;
  return brush;
}

// Whether a brush has any true-color pixels, which no palette operation can
// speak for: Remap moves indices between palettes and these hold none.
export function hasTrueColorPixels(brush: BrushColorIndex): boolean {
  for (let i = STRIDE - 1; i < brush.indexArray.length; i += STRIDE) {
    if (brush.indexArray[i] === ALPHA_TRUECOLOR) {
      return true;
    }
  }
  return false;
}
