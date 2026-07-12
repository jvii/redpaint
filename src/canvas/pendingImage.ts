// The decoded pixels of a just-opened image, held while the image load
// requester is up. Decoding happens *before* the requester so it can describe
// the image (size, distinct colors); the requester's OK consumes this to
// build the canvas content, Cancel discards it. Kept outside Overmind — a
// multi-megabyte ImageData has no business inside a proxied state tree; the
// requester renders from app.imageLoadInfo instead.
let pending: ImageData | null = null;

export function setPendingImage(image: ImageData): void {
  pending = image;
}

export function takePendingImage(): ImageData | null {
  const image = pending;
  pending = null;
  return image;
}

// For the requester's preview: look without consuming.
export function peekPendingImage(): ImageData | null {
  return pending;
}
