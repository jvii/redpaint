export type State = {
  undoBuffer: Blob[];
  currentIndex: number | null;
  readonly currentBufferItem: Blob | null;
  lastUndoRedoTime: number;
};

export const state: State = {
  undoBuffer: [],
  currentIndex: null,
  get currentBufferItem(this: State): Blob | null {
    if (!state.currentIndex) {
      return null;
    }
    return state.undoBuffer[state.currentIndex];
  },
  lastUndoRedoTime: 0,
};
