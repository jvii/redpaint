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
  // Keeps the undo history across a freshDocument upload. Set only by the
  // new-page gesture, where the two halves freshDocument normally bundles come
  // apart: the document's identity should reset, but its history should not.
  //
  // A load drops the old history because the two pictures have nothing to do
  // with each other and the snapshots cost megabytes. Neither holds for an
  // emptied page — it is the same picture, erased, and a blank entry is cheap —
  // so undoing back to what was there is exactly what someone who hit the wrong
  // gadget wants.
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
