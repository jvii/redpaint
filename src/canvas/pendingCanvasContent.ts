import { CanvasColorIndex } from '../domain/CanvasColorIndex';

// Canvas content queued to upload after the next resolution change commits.
// Changing the canvas resolution re-inits the GL drawing buffer via a React
// re-render, so anything uploaded before that commit is lost; content set here
// is uploaded by the resolution-watching effect (useCanvasContentUpload).
// Used by image load (which marks a fresh document — the undo history resets
// to it) and by resizing the canvas while keeping its content
// (resizeCanvasScalingContent / resizeCanvasPlacingContent), which stays in
// the same document and keeps its history.
type PendingCanvasContent = {
  content: CanvasColorIndex;
  freshDocument: boolean;
};

let pending: PendingCanvasContent | null = null;

export function setPendingCanvasContent(
  content: CanvasColorIndex,
  options: { freshDocument: boolean } = { freshDocument: false }
): void {
  pending = { content, freshDocument: options.freshDocument };
}

export function takePendingCanvasContent(): PendingCanvasContent | null {
  const taken = pending;
  pending = null;
  return taken;
}
