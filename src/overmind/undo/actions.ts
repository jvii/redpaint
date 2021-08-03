import { Action } from 'overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { undoBuffer } from './UndoBuffer';

export const setUndoPoint: Action = ({ state }): void => {
  const colorIndex = paintingCanvasController.getIndex();
  if (!colorIndex) {
    console.log('no index');
    return;
  }
  if (state.undo.currentIndex === null) {
    undoBuffer.setBuffer([colorIndex]);
    state.undo.currentIndex = 0;
  } else {
    undoBuffer.setBuffer(
      undoBuffer
        .getBuffer()
        .slice(0, state.undo.currentIndex + 1)
        .concat(colorIndex)
    );
    state.undo.currentIndex = ++state.undo.currentIndex;
  }
  state.undo.lastUndoPointTime = Date.now();
};

export const undo: Action = ({ state }): void => {
  if (!state.undo.currentIndex) {
    // already at index zero or null
    return;
  }
  state.undo.currentIndex = --state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};

export const redo: Action = ({ state }): void => {
  if (state.undo.currentIndex === undoBuffer.getBuffer().length - 1) {
    // already at the last index
    return;
  }
  state.undo.currentIndex = state.undo.currentIndex === null ? 0 : ++state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};
