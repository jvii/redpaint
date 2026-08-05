import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { Color } from '../../types';

// One committed state of the document: the pixels and the palette they index
// into. The palette rides along (a few hundred bytes next to the megabyte
// pixel snapshot) because restoring pixels without the palette they were
// painted against renders them wrong — a depth reduction or a rebuilt palette
// would leave old indices pointing at missing or different colors.
//
// The raster is held as bytes rather than as a CanvasColorIndex, so it can be
// held packed: one byte per pixel instead of the texture's four, whenever the
// picture is fully indexed. The texture needs four because it is an RGBA
// texture, but only R carries anything unless there are true-colour pixels —
// and then the other three are a constant. Four times the history for the same
// memory, on every picture that is not true colour.
export type UndoEntry = {
  palette: Color[];
  width: number;
  height: number;
  // One byte per pixel (indices) when true, the raw RGBA texture bytes when
  // not — and so also the answer to "does this entry hold true-colour pixels?",
  // since packing succeeds exactly when nothing is true colour. One field
  // rather than two that could never legitimately disagree.
  packed: boolean;
  pixels: Uint8Array;
};

// Packs if the picture allows it. toIndexedPixels returns null the moment any
// pixel is true colour, which is both the test and the conversion.
export function createUndoEntry(colorIndex: CanvasColorIndex, palette: Color[]): UndoEntry {
  const indices = colorIndex.toIndexedPixels();
  const { width, height } = colorIndex;
  return indices
    ? { palette, width, height, packed: true, pixels: indices }
    : { palette, width, height, packed: false, pixels: colorIndex.indexArray };
}

// Rebuilds the raster the canvas can take. Costs an allocation and a pass when
// packed, which is the right way round: this happens on an undo, and the
// packing it pays for happens on every stroke. Unpacked entries only need the
// wrapper — the constructor takes a view of the bytes rather than copying them.
//
// A free function rather than a method on the entry, so UndoEntry stays a plain
// data shape: one that can be structure-cloned, and built in a test without
// having to supply behaviour along with the bytes.
export function toCanvasColorIndex(entry: UndoEntry): CanvasColorIndex {
  return entry.packed
    ? CanvasColorIndex.fromIndexedPixels(entry.width, entry.height, entry.pixels)
    : new CanvasColorIndex(entry.width, entry.height, entry.pixels);
}

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
  return entry.pixels.byteLength;
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
