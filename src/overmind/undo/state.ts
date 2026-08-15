export type State = {
  currentIndex: number | null;
  lastUndoRedoTime: number;
  lastUndoPointTime: number;
  // Reactive mirrors of UndoBuffer's size (the buffers live outside Overmind,
  // like brushRecall), for the Preferences drawer's readout. Maintained
  // wherever the buffer is written, which is setUndoPoint and reset only.
  // bufferBytes is every live buffer's, since they share one budget;
  // bufferEntryCount is this page's history alone.
  bufferBytes: number;
  bufferEntryCount: number;
};

export const state: State = {
  currentIndex: null,
  lastUndoRedoTime: 0,
  lastUndoPointTime: 0,
  bufferBytes: 0,
  bufferEntryCount: 0,
};
