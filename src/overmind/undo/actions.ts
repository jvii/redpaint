import { Context } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Color } from '../../types';
import { createUndoEntry, undoBuffer } from './UndoBuffer';
import { newGradientSeed } from '../../brush/fillStyleDraw';
import { plainPalette } from '../../algorithm/imageColors';

export const setUndoPoint = (context: Context): void => {
  // every committed stroke ends here — also the effect chains' reset point
  paintingCanvasController.endEffectStroke();
  newGradientSeed(); // next gradient fill gets fresh dither speckle
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  if (!colorIndex) {
    // the canvas has no readable index texture yet — nothing to snapshot, and
    // an undo point that silently isn't recorded is worth a console entry
    console.warn('setUndoPoint: no canvas color index available');
    return;
  }
  const entry = createUndoEntry(colorIndex, plainPalette(context.state.palette.paletteArray));
  // push owns both the array and the resulting index: it discards the redo
  // future and evicts old entries to stay inside the memory budget, either of
  // which shifts where the new entry lands (see UndoBuffer).
  context.state.undo.currentIndex = undoBuffer.push(entry, context.state.undo.currentIndex);
  syncBufferSize(context);
  context.state.undo.lastUndoPointTime = Date.now();
  // every committed content change passes through here, which is what keeps
  // this flag exact (the scan is memoized on the snapshot)
  context.state.canvas.hasTrueColorPixels = colorIndex.hasTrueColorPixels();
};

// Empties the history. Loading an image starts a new document, so undoing back
// into the previous picture isn't wanted — and note that's a policy call, not a
// technical one: history does survive a canvas resize (useUndo restores each
// snapshot's own resolution before repainting). The reason is cost and sense:
// the buffer holds whole-canvas snapshots worth megabytes each, and the two
// pictures' histories have nothing to do with each other. The caller follows up
// with setUndoPoint for the fresh content, making it the single history entry.
export const reset = (context: Context): void => {
  undoBuffer.clear();
  context.state.undo.currentIndex = null;
  syncBufferSize(context);
};

// Keeps the state mirrors of the buffer's size in step with the buffer itself
// (see undo/state.ts) — call after every write to it.
function syncBufferSize(context: Context): void {
  context.state.undo.bufferBytes = undoBuffer.getTotalBytes();
  context.state.undo.bufferEntryCount = undoBuffer.getBuffer().length;
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
  if (context.state.undo.currentIndex === undoBuffer.getBuffer().length - 1) {
    // already at the last index
    return;
  }
  context.state.undo.currentIndex =
    context.state.undo.currentIndex === null ? 0 : ++context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
  restoreEntryState(context);
};

// Moving through history changes the committed document, so the state that
// rides on the entry follows: the true-color flag (read off how the snapshot
// is held — an entry packs exactly when it has no true-color pixels, so no
// rescan and no raster to rebuild) and the palette the pixels index into.
// Without the palette, undoing a depth reduction or a rebuilt palette would
// restore indices that point at missing or different colors.
function restoreEntryState(context: Context): void {
  const entry = undoBuffer.getItem(context.state.undo.currentIndex);
  context.state.canvas.hasTrueColorPixels = entry ? !entry.packed : false;
  if (entry && !paletteEquals(entry.palette, context.state.palette.paletteArray)) {
    context.actions.palette.replacePalette(entry.palette);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }
}

function paletteEquals(a: Color[], b: { r: number; g: number; b: number }[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((c, i) => c.r === b[i].r && c.g === b[i].g && c.b === b[i].b);
}
