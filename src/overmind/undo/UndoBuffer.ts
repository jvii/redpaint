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

// History is bounded by bytes first and entries second. An entry count alone is
// the wrong knob: a snapshot is 4 bytes per pixel, so one costs 256 KB at
// Lo-Res 320x200 and 24 MB on a 3000x2000 canvas loaded in Native mode — a
// ~100x spread that no single entry count survives. Any count generous enough
// to be useful at Lo-Res will exhaust the tab on a large Native canvas, which
// is reachable in a couple of minutes of ordinary painting.
//
// So MAX_UNDO_BYTES is the real limit and MAX_UNDO_ENTRIES is a ceiling on top
// of it (past ~100 levels the marginal value is nil, and there's no reason to
// hold 400 Lo-Res snapshots just because they fit).
export const MAX_UNDO_ENTRIES = 100;
export const MAX_UNDO_BYTES = 256 * 1024 * 1024;

// ...except that a budget yielding two levels of undo on a huge canvas is its
// own kind of broken — undo is a core promise, and degrading it silently is
// worse than the memory it saves. This floor is honored even when it exceeds
// the byte budget; keeping a canvas so large that it does is the load path's
// problem to prevent, not this buffer's.
export const MIN_UNDO_LEVELS = 10;

// The palette (a few hundred bytes) is not worth counting next to the raster.
function entryBytes(entry: UndoEntry): number {
  return entry.colorIndex.indexArray.byteLength;
}

// How many levels of history a canvas of this size will actually get, once the
// budget and both bounds are applied — the same arithmetic push() performs,
// answered ahead of time. The image-load requester uses it to say what a large
// image is about to cost; 4 bytes per pixel, matching CanvasColorIndex.
export function undoLevelsForCanvas(width: number, height: number): number {
  const bytes = width * height * 4;
  if (bytes <= 0) {
    return MAX_UNDO_ENTRIES;
  }
  return Math.min(MAX_UNDO_ENTRIES, Math.max(MIN_UNDO_LEVELS, Math.floor(MAX_UNDO_BYTES / bytes)));
}

class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
    this.totalBytes = 0;
  }
  undoBuffer: UndoEntry[];
  // maintained incrementally rather than summed on demand — this is read on
  // every committed stroke to decide eviction
  totalBytes: number;

  getItem(index: number | null): UndoEntry | null {
    if (index === null) {
      return null;
    }
    return this.undoBuffer[index];
  }
  getBuffer(): UndoEntry[] {
    return this.undoBuffer;
  }

  getTotalBytes(): number {
    return this.totalBytes;
  }

  // Appends an entry after currentIndex — discarding any redo future beyond it,
  // exactly as a new stroke should — then evicts from the oldest end until the
  // limits are met, and returns the index the new entry ended up at.
  //
  // That return value is why the caller passes its index in rather than
  // maintaining one itself: eviction shifts every surviving entry down, and
  // having one place own both the array and the index is what keeps them from
  // disagreeing. The answer is always "the last slot" — eviction only ever
  // removes entries older than the one just pushed — but going through this
  // method means the caller never has to know that.
  push(entry: UndoEntry, currentIndex: number | null): number {
    const keep = currentIndex === null ? 0 : currentIndex + 1;
    for (let i = keep; i < this.undoBuffer.length; i++) {
      this.totalBytes -= entryBytes(this.undoBuffer[i]);
    }
    this.undoBuffer.length = keep;

    this.undoBuffer.push(entry);
    this.totalBytes += entryBytes(entry);

    while (
      this.undoBuffer.length > MIN_UNDO_LEVELS &&
      (this.undoBuffer.length > MAX_UNDO_ENTRIES || this.totalBytes > MAX_UNDO_BYTES)
    ) {
      this.totalBytes -= entryBytes(this.undoBuffer.shift() as UndoEntry);
    }

    return this.undoBuffer.length - 1;
  }

  clear(): void {
    this.undoBuffer = [];
    this.totalBytes = 0;
  }
}

export const undoBuffer = new UndoBuffer();
