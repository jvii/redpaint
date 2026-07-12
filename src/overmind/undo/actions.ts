import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Color } from '../../types';
import { undoBuffer, UndoEntry } from './UndoBuffer';

export const setUndoPoint = (context: Context): void => {
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  if (!colorIndex) {
    console.log('no index');
    return;
  }
  const entry: UndoEntry = {
    colorIndex,
    palette: context.state.palette.paletteArray.map((c) => ({ r: c.r, g: c.g, b: c.b })),
  };
  if (context.state.undo.currentIndex === null) {
    undoBuffer.setBuffer([entry]);
    context.state.undo.currentIndex = 0;
  } else {
    undoBuffer.setBuffer(
      undoBuffer
        .getBuffer()
        .slice(0, context.state.undo.currentIndex + 1)
        .concat(entry)
    );
    context.state.undo.currentIndex = ++context.state.undo.currentIndex;
  }
  context.state.undo.lastUndoPointTime = Date.now();
  // every committed content change passes through here, which is what keeps
  // this flag exact (the scan is memoized on the snapshot)
  context.state.canvas.hasTrueColorPixels = colorIndex.hasTrueColorPixels();
};

// Empties the history. Loading an image starts a new document: undoing back
// into the previous picture would cross a canvas resize (which undo doesn't
// survive visually), and the buffer holds whole-canvas snapshots worth
// megabytes each. The caller follows up with setUndoPoint for the fresh
// content, making it the single history entry.
export const reset = (context: Context): void => {
  undoBuffer.setBuffer([]);
  context.state.undo.currentIndex = null;
};

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
  context.state.undo.currentIndex = context.state.undo.currentIndex === null ? 0 : ++context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
  restoreEntryState(context);
};

// Moving through history changes the committed document, so the state that
// rides on the entry follows: the true-color flag (memoized on the snapshot —
// no rescan) and the palette the pixels index into. Without the palette,
// undoing a depth reduction or a rebuilt palette would restore indices that
// point at missing or different colors.
function restoreEntryState(context: Context): void {
  const entry = undoBuffer.getItem(context.state.undo.currentIndex);
  context.state.canvas.hasTrueColorPixels = entry
    ? entry.colorIndex.hasTrueColorPixels()
    : false;
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
