import { BrushInterface } from './Brush';
import { CustomBrush } from './CustomBrush';

// The captured Pattern fill pattern. DPaint's Fill Type dialog's "From Brush":
// a single snapshot of a brush's bitmap, decoupled from Brush Recall so
// switching brushes afterward never changes what Pattern fill tiles with. Not
// observable state: the reactive mirror (hasPattern, patternVersion) lives in
// overmind state.fillStyle, the same brushRecall/state.brush split (see
// BrushRecall.ts).
class PatternFillStore {
  pattern: CustomBrush | null = null;
  // Bumped on every capture; GPU texture-cache invalidation reads this the
  // same way DrawImageIndexer reads CustomBrush.lastChanged.
  version = 0;
  // Fill Style dialog's Cancel snapshot. Kept here, not in Overmind state:
  // putting a CustomBrush (wrapping a Uint8Array) into Overmind state gets it
  // deep-proxied for reactivity tracking, which corrupts the typed array
  // (WebGL's texImage2D then rejects it: "parameter 9 is not of type
  // ArrayBufferView"). Overmind only ever sees the boolean/number mirror fields
  // (hasPattern, patternVersion) in state.fillStyle.
  private snapshotPattern: CustomBrush | null = null;
  private snapshotVersion = 0;

  // Snapshots the brush's currently displayed bitmap (brushColorIndex: what a
  // stamp would paint right now), not the pristine matte transform() works
  // from. A built-in's matte is color index 0 with no inherent color, so
  // capturing that would tile as a flat, meaningless color rather than what the
  // user sees.
  //
  // brushColorIndex is never mutated in place, since recoloring allocates a new
  // BrushColorIndex, so wrapping the current reference in a new CustomBrush is
  // a decoupled snapshot. A brush with no bitmap of its own (PixelBrush) has
  // nothing to capture: returns false, leaving any existing pattern alone.
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

  // Restores the pattern as it was when the dialog opened: used by
  // cancelSettings to undo a capture made during the session, the same way it
  // restores mode/axis/dither/jitter.
  restoreSnapshot(): void {
    this.pattern = this.snapshotPattern;
    this.version = this.snapshotVersion;
  }
}

export const patternFillStore = new PatternFillStore();
