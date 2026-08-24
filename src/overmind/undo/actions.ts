import { Context } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { createUndoEntry, totalUndoBytes } from './UndoBuffer';
import { paletteEquals } from '../../algorithm/imageColors';
import { conformParkedPages, currentHistory } from '../pages/PageStore';
import { createNearestMapper } from '../../algorithm/quantize';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { newGradientSeed } from '../../brush/fillStyleDraw';
import { plainPalette } from '../../algorithm/imageColors';

export const setUndoPoint = (context: Context): void => {
  // every committed stroke ends here: also the effect chains' reset point
  paintingCanvasController.endEffectStroke();
  newGradientSeed(); // next gradient fill gets fresh dither speckle
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  if (!colorIndex) {
    // the canvas has no readable index texture yet. Nothing to snapshot, and an
    // undo point that silently isn't recorded is worth a console entry
    console.warn('setUndoPoint: no canvas color index available');
    return;
  }
  // The raw map, not the paletteArray derived: this runs immediately after
  // actions that replace the palette, and a stale one here is invisible until a
  // redo brings the picture back with the palette it had before the change
  // (docs/gotchas.md, "Overmind").
  const entry = createUndoEntry(
    colorIndex,
    plainPalette(Object.values(context.state.palette.palette)),
    plainPalette(context.state.palette.picturePalette)
  );
  // push owns both the array and the resulting index: it discards the redo
  // future and evicts old entries to stay inside the memory budget, either of
  // which shifts where the new entry lands (see UndoBuffer).
  context.state.undo.currentIndex = currentHistory().push(entry, context.state.undo.currentIndex);
  syncBufferSize(context);
  context.state.undo.lastUndoPointTime = Date.now();
  // every committed content change passes through here, which is what keeps
  // this flag exact (the scan is memoized on the snapshot)
  context.state.canvas.hasTrueColorPixels = colorIndex.hasTrueColorPixels();
};

// Empties the history. Loading an image starts a new document, so undoing back
// into the previous picture is not wanted. A policy call, not a technical one:
// history does survive a canvas resize (useUndo restores each snapshot's own
// resolution). Snapshots cost megabytes and the two pictures are unrelated. The
// caller follows with setUndoPoint, making the fresh content the one entry.
export const reset = (context: Context): void => {
  currentHistory().clear();
  context.state.undo.currentIndex = null;
  syncBufferSize(context);
};

// Keeps the state mirrors of the buffer's size in step with the buffer itself
// (see undo/state.ts): call after every write to it, and after a page swap,
// which changes which history the readout is describing without writing to
// either.
export function syncBufferSize(context: Context): void {
  context.state.undo.bufferBytes = totalUndoBytes();
  context.state.undo.bufferEntryCount = currentHistory().getBuffer().length;
}

export const undo = (context: Context): void => {
  if (!context.state.undo.currentIndex) {
    // already at index zero or null
    return;
  }
  context.state.undo.currentIndex = --context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
  restoreEntryState(context);
};

export const redo = (context: Context): void => {
  if (context.state.undo.currentIndex === currentHistory().getBuffer().length - 1) {
    // already at the last index
    return;
  }
  context.state.undo.currentIndex =
    context.state.undo.currentIndex === null ? 0 : ++context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
  restoreEntryState(context);
};

// Moving through history changes the committed document, so the state riding on
// the entry follows: the true-color flag (read off how the snapshot is held; an
// entry packs exactly when it has none, so no rescan) and the palette the
// pixels index into. Without the palette, undoing a depth reduction would
// restore indices pointing at missing or different colors.
function restoreEntryState(context: Context): void {
  const entry = currentHistory().getItem(context.state.undo.currentIndex);
  context.state.canvas.hasTrueColorPixels = entry ? !entry.packed : false;
  if (entry && !paletteEquals(entry.palette, Object.values(context.state.palette.palette))) {
    const oldPalette = plainPalette(Object.values(context.state.palette.palette));
    context.actions.palette.replacePalette(entry.palette);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
    // The palette belongs to the document, not to the page whose history this
    // is, so putting an older one back is the same kind of event as a depth
    // reduction: every page indexes into it, and the pages that are not on
    // screen have to come along or they are left indexing colors that moved.
    // Only ever reached by an undo that crosses a palette change, which is
    // rare — the common step compares equal here and does nothing.
    //
    // remapAll, because the whole palette was replaced: every indexed pixel
    // resolves to the color it was showing and takes the nearest new one.
    // Nothing is flattened; an undo is not the True Color switch.
    conformParkedPages(
      (colorIndex): CanvasColorIndex =>
        colorIndex.conformedTo(
          oldPalette,
          entry.palette,
          false,
          true,
          createNearestMapper(entry.palette)
        ),
      entry.palette
    );
  }
  // Last, because replacePalette above syncs this to whatever it installs. The
  // entry's own record is the truth: it is what the restored pixels mean, which
  // is not the same as what they display as while a hand edit or a Use Brush
  // sits between the two (docs/brush-palette.md).
  if (entry) {
    context.state.palette.picturePalette = entry.sourcePalette;
  }
}

