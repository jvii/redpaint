// Whether the startup restore found a record, answered once per page load.
// The canvas fit waits on this and runs only when the answer is "nothing to
// restore", so the two never both decide the startup size
// (docs/autosave-simplification.md §4).
let settle: (restored: boolean) => void = () => undefined;

export const restoreSettled: Promise<boolean> = new Promise<boolean>((resolve): void => {
  settle = resolve;
});

// True when a record was applied, so the canvas already has its size.
// Resolving twice is harmless: the first answer stands.
export function markRestoreSettled(restored: boolean): void {
  settle(restored);
}
