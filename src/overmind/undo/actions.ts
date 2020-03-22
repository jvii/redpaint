import { Action, AsyncAction } from 'overmind';
import { buffer } from './state';

export const setUndoPoint: AsyncAction<HTMLCanvasElement> = async (
  { state },
  canvas
): Promise<void> => {
  const blob: Blob | null = await new Promise((resolve): void => {
    canvas.toBlob(resolve);
  });
  if (!blob) {
    return;
  }
  if (state.undo.currentIndex === null) {
    buffer.setBuffer([blob]);
    state.undo.currentIndex = 0;
  } else {
    buffer.setBuffer(
      buffer
        .getBuffer()
        .slice(0, state.undo.currentIndex + 1)
        .concat(blob)
    );
    state.undo.currentIndex = ++state.undo.currentIndex;
  }
};

export const undo: Action = ({ state }): void => {
  if (!state.undo.currentIndex) {
    return;
  }
  state.undo.currentIndex = --state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};

export const redo: Action = ({ state }): void => {
  if (state.undo.currentIndex === buffer.getBuffer().length - 1) {
    return;
  }
  state.undo.currentIndex = state.undo.currentIndex === null ? 0 : ++state.undo.currentIndex;
  state.undo.lastUndoRedoTime = Date.now();
};
