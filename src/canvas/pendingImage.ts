// The decoded pixels of a just-opened image, held while the image load
// requester is up. Decoding happens *before* the requester so it can describe
// the image (size, distinct colors); the requester's OK consumes this to build
// the canvas content, Cancel discards it. Kept outside Overmind. A
// multi-megabyte ImageData has no business inside a proxied state tree; the
// requester renders from app.imageLoadInfo instead.
//
// The document name the file supplies waits here too. It is part of the same
// payload (decoded on the way in, applied only if the requester is answered
// with OK), and nothing renders it, so state would be the wrong home for it.
type PendingImage = { image: ImageData; documentName: string };

let pending: PendingImage | null = null;

export function setPendingImage(image: ImageData, documentName: string): void {
  pending = { image, documentName };
}

export function takePendingImage(): PendingImage | null {
  const taken = pending;
  pending = null;
  return taken;
}

// For the requester's preview: look without consuming.
export function peekPendingImage(): ImageData | null {
  return pending?.image ?? null;
}
