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
    if (!this.currentIndex) {
      return null;
    }
    return this.undoBuffer[this.currentIndex];
  },
  lastUndoRedoTime: 0,
};
