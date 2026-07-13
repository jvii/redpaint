// The decoded pixels of a just-opened brush image, held while the brush load
// requester is up. Mirrors pendingImage.ts: decoding happens before the
// requester so it can describe the brush (size, distinct colors); the
// requester's OK consumes this to build the BrushColorIndex, Cancel discards
// it. Kept outside Overmind — a multi-megabyte ImageData has no business
// inside a proxied state tree; the requester renders from app.brushLoadInfo
// instead.
let pending: ImageData | null = null;

export function setPendingBrush(image: ImageData): void {
  pending = image;
}

export function takePendingBrush(): ImageData | null {
  const image = pending;
  pending = null;
  return image;
}

// For the requester's preview: look without consuming.
export function peekPendingBrush(): ImageData | null {
  return pending;
}
