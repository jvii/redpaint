class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
  }
  undoBuffer: Blob[];

  getItem(index: number | null): Blob | null {
    if (!index) {
      return null;
    }
    return this.undoBuffer[index];
  }
  getBuffer(): Blob[] {
    return this.undoBuffer;
  }
  setBuffer(buffer: Blob[]): void {
    this.undoBuffer = buffer;
  }
}

export const buffer = new UndoBuffer();

export type State = {
  currentIndex: number | null;
  readonly currentBufferItem: Blob | null;
  lastUndoRedoTime: number;
};

export const state: State = {
  currentIndex: null,
  get currentBufferItem(this: State): Blob | null {
    if (!this.currentIndex) {
      return null;
    }
    return buffer.getItem(this.currentIndex);
  },
  lastUndoRedoTime: 0,
};
