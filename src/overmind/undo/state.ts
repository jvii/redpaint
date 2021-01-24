export type State = {
  currentIndex: number | null;
  lastUndoRedoTime: number;
};

export const state: State = {
  currentIndex: null,
  lastUndoRedoTime: 0,
};
