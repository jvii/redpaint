import { CanvasColorIndex } from '../../domain/CanvasColorIndex';

class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
  }
  undoBuffer: CanvasColorIndex[];

  getItem(index: number | null): CanvasColorIndex | null {
    if (index === null) {
      return null;
    }
    return this.undoBuffer[index];
  }
  getBuffer(): CanvasColorIndex[] {
    return this.undoBuffer;
  }
  setBuffer(buffer: CanvasColorIndex[]): void {
    this.undoBuffer = buffer;
  }
}

export const undoBuffer = new UndoBuffer();
