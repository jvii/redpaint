import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { Color } from '../../types';

// One committed state of the document: the pixels and the palette they index
// into. The palette rides along (a few hundred bytes next to the megabyte
// pixel snapshot) because restoring pixels without the palette they were
// painted against renders them wrong — a depth reduction or a rebuilt palette
// would leave old indices pointing at missing or different colors.
export type UndoEntry = {
  colorIndex: CanvasColorIndex;
  palette: Color[];
};

class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
  }
  undoBuffer: UndoEntry[];

  getItem(index: number | null): UndoEntry | null {
    if (index === null) {
      return null;
    }
    return this.undoBuffer[index];
  }
  getBuffer(): UndoEntry[] {
    return this.undoBuffer;
  }
  setBuffer(buffer: UndoEntry[]): void {
    this.undoBuffer = buffer;
  }
}

export const undoBuffer = new UndoBuffer();
