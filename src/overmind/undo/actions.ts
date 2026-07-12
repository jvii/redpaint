import { Context } from '../../overmind'
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { undoBuffer } from './UndoBuffer';

export const setUndoPoint = (context: Context): void => {
  const colorIndex = paintingCanvasController.getCanvasColorIndex();
  if (!colorIndex) {
    console.log('no index');
    return;
  }
  if (context.state.undo.currentIndex === null) {
    undoBuffer.setBuffer([colorIndex]);
    context.state.undo.currentIndex = 0;
  } else {
    undoBuffer.setBuffer(
      undoBuffer
        .getBuffer()
        .slice(0, context.state.undo.currentIndex + 1)
        .concat(colorIndex)
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
  syncTrueColorFlag(context);
};

export const redo = (context: Context): void => {
  if (context.state.undo.currentIndex === undoBuffer.getBuffer().length - 1) {
    // already at the last index
    return;
  }
  context.state.undo.currentIndex = context.state.undo.currentIndex === null ? 0 : ++context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
  syncTrueColorFlag(context);
};

// Moving through history changes the committed content, so the flag follows
// the snapshot moved to (memoized on it — no rescan).
function syncTrueColorFlag(context: Context): void {
  const item = undoBuffer.getItem(context.state.undo.currentIndex);
  context.state.canvas.hasTrueColorPixels = item ? item.hasTrueColorPixels() : false;
}
