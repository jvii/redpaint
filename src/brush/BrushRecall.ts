import { BrushInterface } from './Brush';
import { PixelBrush } from './PixelBrush';
import { CustomBrush } from './CustomBrush';
import { isBuiltInBrush } from '../overmind/brush/state';

// The automatic brush-recall layer (docs/brush-slots.md): a few named
// references, deliberately not a history list. The class is not observable
// state — reactive mirrors of "is there something to recall" live in
// overmind state.brush (hasOriginalBrush).
class BrushRecall {
  constructor() {
    this.current = new PixelBrush();
    this.originalBrush = null;
    this.previousBrush = null;
  }
  current: BrushInterface;
  // The pre-transform brush, restorable via Restore / Shift-B
  // (docs/brush-transforms.md): captured on the first transform, kept across
  // further ones, dropped only when a new custom brush arrives — a fresh
  // capture/load makes the old original moot. Restore is disabled outright
  // while a built-in brush is active (BrushMenu.tsx), so this is never read
  // in that state — no need to track it across a built-in detour.
  originalBrush: BrushInterface | null;
  // Whatever custom brush setCustom is about to replace — the Previous slot
  // (docs/brush-slots.md): captures a brush the moment a different one
  // (capture, load, slot recall) takes over, so switching custom brushes
  // never silently loses the one you were just using. Restore goes through
  // the separate restore() method instead, since reverting to a brush you
  // already had isn't a "switch". Built-ins are excluded from banking —
  // they're one click away in the built-in row already.
  previousBrush: CustomBrush | null;

  // A new custom brush (captured, loaded, restored) becomes current
  setCustom(newBrush: BrushInterface): void {
    if (
      this.current instanceof CustomBrush &&
      !isBuiltInBrush(this.current) &&
      this.current !== newBrush
    ) {
      this.previousBrush = this.current;
    }
    this.current = newBrush;
    this.originalBrush = null;
  }

  // A built-in brush becomes current: a detour, so the pre-transform
  // snapshot survives it (moot in practice — see originalBrush's comment)
  setBuiltIn(newBrush: BrushInterface): void {
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

  // Restore / Shift-B reverting a transformed custom brush to its
  // pre-transform original: unlike setCustom, this doesn't bank the
  // transformed brush into previousBrush. It's not a switch to a different
  // brush — it's undoing back to one you already had, so surfacing it in
  // Previous would be surprising rather than useful.
  restore(original: BrushInterface): void {
    this.current = original;
    this.originalBrush = null;
  }
}

export const brushRecall = new BrushRecall();
