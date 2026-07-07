import { CanvasColorIndex } from '../domain/CanvasColorIndex';

// Canvas content queued to upload after the next resolution change commits.
// Changing the canvas resolution re-inits the GL drawing buffer via a React
// re-render, so anything uploaded before that commit is lost; content set here
// is uploaded by the resolution-watching effect in useLoadedImage instead.
// Used by image load (own-size) and by resizing the canvas while keeping its
// content (resizeCanvasScalingContent / resizeCanvasPlacingContent).
let pending: CanvasColorIndex | null = null;

export function setPendingCanvasContent(content: CanvasColorIndex): void {
  pending = content;
}

export function takePendingCanvasContent(): CanvasColorIndex | null {
  const content = pending;
  pending = null;
  return content;
}
