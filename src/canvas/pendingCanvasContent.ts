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
  // What to call the new document, for a freshDocument upload: the loaded
  // file's name without its extension, or '' when the pixels came from
  // somewhere unnamed (the clipboard). Carried with the content rather than
  // set when the load starts, so a load the user cancels never renames the
  // picture that is still on screen.
  documentName: string;
  // Whether this fresh document arrives with changes no file has. A load or a
  // paste does not (a file is exactly where it came from); a restored autosave
  // may, and saying otherwise would claim work is safe when it is not.
  documentModified: boolean;
  // Keeps the undo history across a freshDocument upload. Only the new-page
  // gesture sets it, where freshDocument's two halves come apart: the
  // document's identity resets, its history does not. A load drops history
  // because the pictures are unrelated and snapshots cost megabytes; an emptied
  // page is the same picture, so undoing back to it is what is wanted.
  keepHistory: boolean;
};

type Options = {
  freshDocument?: boolean;
  recordUndoPoint?: boolean;
  documentName?: string;
  documentModified?: boolean;
  keepHistory?: boolean;
};

let pending: PendingCanvasContent | null = null;

export function setPendingCanvasContent(content: CanvasColorIndex, options: Options = {}): void {
  pending = {
    content,
    freshDocument: options.freshDocument ?? false,
    recordUndoPoint: options.recordUndoPoint ?? true,
    documentName: options.documentName ?? '',
    documentModified: options.documentModified ?? false,
    keepHistory: options.keepHistory ?? false,
  };
}

export function takePendingCanvasContent(): PendingCanvasContent | null {
  const taken = pending;
  pending = null;
  return taken;
}

// Whether content is queued and waiting for its resize to commit. The startup
// auto-fit asks, because between the resize being requested and the upload
// landing the canvas looks blank and unnamed while in fact it already belongs
// to a restored or loaded document — see setStartupResolution.
export function hasPendingCanvasContent(): boolean {
  return pending !== null;
}
