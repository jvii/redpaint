export type State = {
  currentIndex: number | null;
  lastUndoRedoTime: number;
  lastUndoPointTime: number;
};

export const state: State = {
  currentIndex: null,
  lastUndoRedoTime: 0,
  lastUndoPointTime: 0,
};
