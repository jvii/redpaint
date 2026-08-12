// The decoded pixels of a just-opened image, held while the image load
// requester is up: decoding happens before the requester so it can describe the
// image, and OK consumes this while Cancel discards it. Outside Overmind, since
// a multi-megabyte ImageData has no business in a proxied state tree; the
// requester renders from app.imageLoadInfo.
//
// The document name the file supplies waits here too, as part of the same
// payload, applied only if the requester is answered with OK.
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
