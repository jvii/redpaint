// The resolver for an in-flight save-name prompt, held outside Overmind the way
// pendingImage and pendingCanvasContent hold their payloads: a promise's resolve
// function is not state, and putting a callback in an observable store would
// make every reader of that store depend on it.
//
// saveFile awaits the promise; SaveNameDialog settles it — with the typed name
// on OK, or null on Cancel. Only one can be open at a time (it is a modal), so
// one slot is enough.
let resolver: ((name: string | null) => void) | null = null;

export function beginSaveNamePrompt(): Promise<string | null> {
  // A prompt already waiting means a previous one was never answered; settle it
  // as cancelled rather than leaving its caller hanging forever.
  settleSaveNamePrompt(null);
  return new Promise<string | null>((resolve): void => {
    resolver = resolve;
  });
}

export function settleSaveNamePrompt(name: string | null): void {
  const settle = resolver;
  resolver = null;
  settle?.(name);
}
