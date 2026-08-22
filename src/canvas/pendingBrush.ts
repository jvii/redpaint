import { Color, Point } from '../types';

// The decoded pixels of a just-opened brush image, held while the brush load
// requester is up. Mirrors pendingImage.ts: decoding happens before the
// requester so it can describe the brush (size, distinct colors); the
// requester's OK consumes this to build the BrushColorIndex, Cancel discards
// it. Kept outside Overmind. A multi-megabyte ImageData has no business inside
// a proxied state tree; the requester renders from app.brushLoadInfo instead.
// What an indexed file brought with it, alongside the pixels the preview
// draws. Present only for a brush whose palette we could actually recover,
// which today means IFF: PNG and GIF arrive through an <img> as RGBA with
// nothing kept (docs/brush-save.md).
export type PendingBrushPalette = {
  palette: Color[];
  pixels: Uint8Array; // one byte per pixel, rows top-down
  transparentColor?: number; // 0-based index that stands for a hole
};

let pending: ImageData | null = null;
let pendingPalette: PendingBrushPalette | null = null;
let pendingHandle: Point | null = null;

export function setPendingBrush(
  image: ImageData,
  withPalette?: PendingBrushPalette,
  handle?: Point
): void {
  pending = image;
  pendingPalette = withPalette ?? null;
  pendingHandle = handle ?? null;
}

export function takePendingBrush(): ImageData | null {
  const image = pending;
  pending = null;
  return image;
}

// Read alongside takePendingBrush, which is what clears it.
export function pendingBrushPalette(): PendingBrushPalette | null {
  return pendingPalette;
}

// The GRAB point an IFF brush recorded, if it had one (docs/brush-handle.md).
// Read alongside takePendingBrush, as the palette above is.
export function pendingBrushHandle(): Point | null {
  return pendingHandle;
}

// For the requester's preview: look without consuming.
export function peekPendingBrush(): ImageData | null {
  return pending;
}
