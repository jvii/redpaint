class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
  }
  undoBuffer: Uint8Array[];

  getItem(index: number | null): Uint8Array | null {
    if (index === null) {
      return null;
    }
    return this.undoBuffer[index];
  }
  getBuffer(): Uint8Array[] {
    return this.undoBuffer;
  }
  setBuffer(buffer: Uint8Array[]): void {
    this.undoBuffer = buffer;
  }
}

export const undoBuffer = new UndoBuffer();
