import { BrushInterface } from './Brush';
import { PixelBrush } from './PixelBrush';

// The automatic brush-recall layer (docs/brush-slots.md): a few named
// references, deliberately not a history list. The class is not observable
// state — reactive mirrors of "is there something to recall" live in
// overmind state.brush (hasOriginalBrush, hasLastCustomBrush).
class BrushHistory {
  constructor() {
    this.current = new PixelBrush();
    this.originalBrush = null;
    this.lastCustomBrush = null;
  }
  current: BrushInterface;
  // The pre-transform brush, restorable via Restore / Shift-B
  // (docs/brush-transforms.md): captured on the first transform, kept across
  // further ones and across built-in detours, dropped only when a new custom
  // brush arrives — a fresh capture/load makes the old original moot.
  originalBrush: BrushInterface | null;
  // The most recent custom (captured or loaded) brush, in its latest
  // transformed state — what Shift-B re-activates from a built-in brush
  // (DPaint's UserBr). Goes stale by replacement, never cleared.
  lastCustomBrush: BrushInterface | null;

  // A new custom brush (captured, loaded, restored) becomes current
  setCustom(newBrush: BrushInterface): void {
    this.current = newBrush;
    this.lastCustomBrush = newBrush;
    this.originalBrush = null;
  }

  // A built-in brush becomes current: a detour, so both recalls survive it
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
    this.lastCustomBrush = newBrush;
  }

  // Shift-B from a built-in: back to the custom brush as it was left,
  // preserving its pre-transform original for a second Shift-B
  reactivateLastCustom(): void {
    if (this.lastCustomBrush !== null) {
      this.current = this.lastCustomBrush;
    }
  }
}

export const brushHistory = new BrushHistory();
