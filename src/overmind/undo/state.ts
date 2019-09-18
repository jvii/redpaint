import { Derive } from 'overmind'

export type State = {
  undoBuffer: Blob[];
  currentIndex: number | null;
  currentBufferItem: Derive<State, Blob | null>
  lastUndoRedoTime: number;
};

export const state: State = {
  undoBuffer: [],
  currentIndex: null,
  currentBufferItem: (state): Blob | null => {
    if (!state.currentIndex) {
      return null;
    }
    return state.undoBuffer[state.currentIndex];
  },
  lastUndoRedoTime: 0,
};
