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
};

export const undo = (context: Context): void => {
  if (!context.state.undo.currentIndex) {
    // already at index zero or null
    return;
  }
  context.state.undo.currentIndex = --context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
};

export const redo = (context: Context): void => {
  if (context.state.undo.currentIndex === undoBuffer.getBuffer().length - 1) {
    // already at the last index
    return;
  }
  context.state.undo.currentIndex = context.state.undo.currentIndex === null ? 0 : ++context.state.undo.currentIndex;
  context.state.undo.lastUndoRedoTime = Date.now();
};
