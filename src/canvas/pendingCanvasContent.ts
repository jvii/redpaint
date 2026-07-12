import { CanvasColorIndex } from '../domain/CanvasColorIndex';

// Canvas content queued to upload after the next resolution change commits.
// Changing the canvas resolution re-inits the GL drawing buffer via a React
// re-render, so anything uploaded before that commit is lost; content set here
// is uploaded by the resolution-watching effect (useCanvasContentUpload).
//
// The options say what the upload means for the undo history:
//  - image load: freshDocument (history resets to this content, its single
//    entry)
//  - content-preserving resize: defaults (this content becomes the next entry
//    of the same document)
//  - undo/redo restore across a canvas size change: recordUndoPoint false —
//    navigating history must not append to it
type PendingCanvasContent = {
  content: CanvasColorIndex;
  freshDocument: boolean;
  recordUndoPoint: boolean;
};

type Options = {
  freshDocument?: boolean;
  recordUndoPoint?: boolean;
};

let pending: PendingCanvasContent | null = null;

export function setPendingCanvasContent(content: CanvasColorIndex, options: Options = {}): void {
  pending = {
    content,
    freshDocument: options.freshDocument ?? false,
    recordUndoPoint: options.recordUndoPoint ?? true,
  };
}

export function takePendingCanvasContent(): PendingCanvasContent | null {
  const taken = pending;
  pending = null;
  return taken;
}
