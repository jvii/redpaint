// Whether the startup restore found a record, answered once per page load.
//
// The startup canvas has two possible authors — the saved record's own size,
// and the drawing pane it would otherwise be fitted to — and they used to race,
// with a check inside setStartupResolution refereeing between them. Sequencing
// them removes the race instead of guarding it: the fit waits for this, and
// runs only when the answer is "nothing to restore"
// (docs/autosave-simplification.md §4).
//
// A module-level promise rather than Overmind state: it is answered exactly
// once, before any of it is interesting to render, and a waiter wants to await
// it rather than re-render for it.
let settle: (restored: boolean) => void = () => undefined;

export const restoreSettled: Promise<boolean> = new Promise<boolean>((resolve): void => {
  settle = resolve;
});

// Called once loadDocument has answered — with true when a record was applied,
// so the canvas already has its size, and false when the fit should proceed.
// Resolving twice is harmless: the first answer stands.
export function markRestoreSettled(restored: boolean): void {
  settle(restored);
}
