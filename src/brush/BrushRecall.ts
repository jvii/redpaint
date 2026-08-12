import { BrushInterface } from './Brush';
import { PixelBrush } from './PixelBrush';
import { CustomBrush } from './CustomBrush';
import { isBuiltInBrush } from '../overmind/brush/state';

// The automatic brush-recall layer (docs/brush-slots.md): a few named
// references, deliberately not a history list. The class is not observable
// state. Reactive mirrors of "is there something to recall" live in overmind
// state.brush (hasOriginalBrush).
class BrushRecall {
  constructor() {
    this.current = new PixelBrush();
    this.originalBrush = null;
    this.previousBrush = null;
  }
  current: BrushInterface;
  // The pre-transform brush, restorable via Restore / Shift-B
  // (docs/brush-transforms.md): captured on the first transform, kept across
  // further ones, dropped only when a new custom brush arrives. A fresh
  // capture/load makes the old original moot. Restore is disabled outright
  // while a built-in brush is active (BrushMenu.tsx), so this is never read in
  // that state. No need to track it across a built-in detour.
  originalBrush: BrushInterface | null;
  // Whatever custom brush was active before the current one took over: the
  // Previous slot (docs/brush-slots.md), banked the moment a different one
  // takes over. A built-in is excluded from ever becoming previousBrush, being
  // one click away in the built-in row already, but banking *away* from one is
  // fine (bankCurrentAsPrevious). Restore goes through restore() instead, since
  // reverting to a brush you already had is not a switch.
  previousBrush: CustomBrush | null;

  // The brush a switch is about to leave behind survives in previousBrush, as
  // long as it's a genuine custom brush and not a built-in (built-ins don't
  // need a way back: see previousBrush's comment)
  private bankCurrentAsPrevious(): void {
    if (this.current instanceof CustomBrush && !isBuiltInBrush(this.current)) {
      this.previousBrush = this.current;
    }
  }

  // A new custom brush (captured, loaded, restored) becomes current
  setCustom(newBrush: BrushInterface): void {
    if (this.current !== newBrush) {
      this.bankCurrentAsPrevious();
    }
    this.current = newBrush;
    this.originalBrush = null;
  }

  // A built-in brush becomes current: banks the outgoing custom brush into
  // Previous same as setCustom, since Restore no longer offers a way back
  // to it from a built-in (docs/brush-transforms.md)
  setBuiltIn(newBrush: BrushInterface): void {
    this.bankCurrentAsPrevious();
    this.current = newBrush;
  }

  // A transformed variant of the current custom brush becomes current:
  // capture the original on the first transform in a run, keep it after
  setTransformed(newBrush: BrushInterface): void {
    if (this.originalBrush === null) {
      this.originalBrush = this.current;
    }
    this.current = newBrush;
  }

  // Restore / Shift-B reverting a transformed custom brush to its pre-transform
  // original. Unlike setCustom it does not bank into previousBrush: undoing a
  // transform is not a switch to a different brush.
  restore(original: BrushInterface): void {
    this.current = original;
    this.originalBrush = null;
  }
}

export const brushRecall = new BrushRecall();
