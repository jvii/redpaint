import { BrushInterface } from './Brush';
import { CustomBrush } from './CustomBrush';

// The captured Pattern fill pattern — DPaint's Fill Type dialog's "From
// Brush": a single snapshot of a brush's bitmap, decoupled from Brush
// Recall so switching brushes afterward never changes what Pattern fill
// tiles with. Not observable state — the reactive mirror (hasPattern,
// patternThumbnail, patternSize) lives in overmind state.fillStyle, the
// same brushRecall/state.brush split (see BrushRecall.ts).
class PatternFillStore {
  pattern: CustomBrush | null = null;
  // Bumped on every capture; GPU texture-cache invalidation reads this the
  // same way DrawImageIndexer reads CustomBrush.lastChanged.
  version = 0;
  // Fill Style dialog's Cancel snapshot — kept here, not in Overmind state:
  // putting a CustomBrush (wrapping a Uint8Array) into Overmind state gets
  // it deep-proxied for reactivity tracking, which corrupts the typed array
  // (WebGL's texImage2D then rejects it: "parameter 9 is not of type
  // ArrayBufferView"). Overmind only ever sees the boolean/number mirror
  // fields (hasPattern, patternVersion) in state.fillStyle.
  private snapshotPattern: CustomBrush | null = null;
  private snapshotVersion = 0;

  // Snapshots the given brush's CURRENTLY DISPLAYED bitmap (brushColorIndex
  // — whatever a stamp would paint right now: FG-colorized for a built-in
  // or a Color/Cycle-mode custom brush, matte for Matte/Repl mode, the
  // brush's own captured colors for anything lifted straight off the
  // canvas) into an independent pattern — not the pristine matte
  // (CustomBrush.transform's job, used for actual brush transforms): a
  // built-in's matte is always color index 0 with no inherent color at
  // all (colorized only at stamp time), so capturing that would tile as a
  // flat, meaningless color rather than what the user actually sees.
  // brushColorIndex is never mutated in place — recoloring always
  // allocates a new BrushColorIndex (CustomBrush.setFGColor et al) — so
  // wrapping the current reference in a new CustomBrush is a safe,
  // decoupled snapshot, same guarantee transform()'s identity clone gives.
  // Brushes with no bitmap of their own (PixelBrush — the primitive brush
  // before anything has ever been captured/selected) have nothing to
  // capture; returns false and leaves any existing pattern untouched.
  captureFrom(brush: BrushInterface): boolean {
    if (!(brush instanceof CustomBrush)) {
      return false;
    }
    this.pattern = new CustomBrush(brush.brushColorIndex, brush.width, brush.heigth);
    this.version++;
    return true;
  }

  // Called when the Fill Style dialog opens, so a capture made during that
  // session can be undone by restoreSnapshot().
  takeSnapshot(): void {
    this.snapshotPattern = this.pattern;
    this.snapshotVersion = this.version;
  }

  // Restores the pattern as it was when the dialog opened — used by
  // cancelSettings to undo a capture made during the session, the same way
  // it restores mode/axis/dither/jitter.
  restoreSnapshot(): void {
    this.pattern = this.snapshotPattern;
    this.version = this.snapshotVersion;
  }
}

export const patternFillStore = new PatternFillStore();
