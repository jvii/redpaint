import { Action, AsyncAction } from 'overmind';

export const setUndoPoint: AsyncAction<HTMLCanvasElement> = async ({ state }, canvas) => {
  console.log('setUndoPoint');
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve));
  if (!blob) {
    return;
  }
  if (state.undo.currentIndex === null) {
    state.undo.undoBuffer = [blob];
    state.undo.currentIndex = 0;
  } else {
    state.undo.undoBuffer = state.undo.undoBuffer
      .slice(0, state.undo.currentIndex + 1)
      .concat(blob);
    state.undo.currentIndex = ++state.undo.currentIndex;
  }
};

export const undo: Action = ({ state }) => {
  console.log('undo');
  if (!state.undo.currentIndex) {
    return;
  }
  state.undo.currentIndex = --state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};

export const redo: Action = ({ state }) => {
  console.log('redo');
  if (state.undo.currentIndex === state.undo.undoBuffer.length - 1) {
    return;
  }
  state.undo.currentIndex = state.undo.currentIndex === null ? 0 : ++state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};
