import { SaveFormat } from './saveFormats';

// What the Save As requester answers with.
export type SaveAsChoice = {
  format: SaveFormat;
  // The base name, or null when the browser has a save picker of its own and
  // the requester therefore never asked: the picker is about to. Null is not
  // "no name": it means the name is somebody else's question.
  name: string | null;
};

// The resolver for an in-flight Save As prompt, held outside Overmind the way
// pendingImage and pendingCanvasContent hold their payloads: a promise's
// resolve function is not state, and putting a callback in an observable store
// would make every reader of that store depend on it.
//
// PictureMenu awaits the promise; SaveAsDialog settles it, with the choice on
// Save, or null on Cancel. Only one can be open at a time (it is a modal), so
// one slot is enough.
let resolver: ((choice: SaveAsChoice | null) => void) | null = null;

export function beginSaveAsPrompt(): Promise<SaveAsChoice | null> {
  // A prompt already waiting means a previous one was never answered; settle it
  // as cancelled rather than leaving its caller hanging forever.
  settleSaveAsPrompt(null);
  return new Promise<SaveAsChoice | null>((resolve): void => {
    resolver = resolve;
  });
}

export function settleSaveAsPrompt(choice: SaveAsChoice | null): void {
  const settle = resolver;
  resolver = null;
  settle?.(choice);
}
