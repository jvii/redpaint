import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { Color } from '../../types';

// One committed state of the document: the pixels and the palette they index
// into. The palette rides along (a few hundred bytes beside a megabyte
// snapshot) because a depth reduction or a rebuilt palette would leave old
// indices pointing at missing or different colors.
//
// Bytes rather than a CanvasColorIndex so the raster can be held packed: one
// byte per pixel instead of the texture's four whenever the picture is fully
// indexed, which is four times the history for the same memory.
export type UndoEntry = {
  palette: Color[];
  width: number;
  height: number;
  // One byte per pixel (indices) when true, the raw RGBA texture bytes when
  // not, and so also the answer to "does this entry hold true-colour pixels?",
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

// Rebuilds the raster the canvas can take. The allocation and pass this costs
// when packed happens on an undo; the packing it pays for happens on every
// stroke. A free function, not a method, so UndoEntry stays plain data that can
// be structure-cloned and built in a test.
export function toCanvasColorIndex(entry: UndoEntry): CanvasColorIndex {
  return entry.packed
    ? CanvasColorIndex.fromIndexedPixels(entry.width, entry.height, entry.pixels)
    : new CanvasColorIndex(entry.width, entry.height, entry.pixels);
}

// Bounded by bytes first, entries second. An entry count alone cannot work: a
// snapshot costs 256KB at Lo-Res 320x200 and 24MB on a 3000x2000 Native canvas,
// and no single count survives a 100x spread: one generous enough for Lo-Res
// exhausts the tab on a large canvas within minutes. MAX_UNDO_BYTES is the real
// limit; MAX_UNDO_ENTRIES is a ceiling on top of it.
export const MAX_UNDO_ENTRIES = 100;
export const MAX_UNDO_BYTES = 256 * 1024 * 1024;

// ...except that a budget yielding two levels of undo on a huge canvas is its
// own kind of broken. Undo is a core promise, and degrading it silently is
// worse than the memory it saves. This floor is honored even when it exceeds
// the byte budget; keeping a canvas so large that it does is the load path's
// problem to prevent, not this buffer's.
export const MIN_UNDO_LEVELS = 10;

// The palette (a few hundred bytes) is not worth counting next to the raster.
function entryBytes(entry: UndoEntry): number {
  return entry.pixels.byteLength;
}

// How many levels of history a canvas of this size will actually get, once the
// budget and both bounds are applied: the same arithmetic push() performs,
// answered ahead of time. The image-load requester uses it to say what a large
// image is about to cost; 4 bytes per pixel, matching CanvasColorIndex.
export function undoLevelsForCanvas(width: number, height: number): number {
  const bytes = width * height * 4;
  if (bytes <= 0) {
    return MAX_UNDO_ENTRIES;
  }
  return Math.min(MAX_UNDO_ENTRIES, Math.max(MIN_UNDO_LEVELS, Math.floor(MAX_UNDO_BYTES / bytes)));
}

// The histories sharing the byte budget: one per page of the document
// (PageStore registers each as it creates it). Registration is explicit rather
// than done in the constructor so that a buffer built on its own — in a test —
// is measured against itself alone and cannot be perturbed by any other.
const budgetSharers: UndoBuffer[] = [];

export function shareBudget(buffer: UndoBuffer): void {
  budgetSharers.push(buffer);
}

// A history that no page owns any more. Without this its bytes would go on
// counting against what the surviving pages may keep, forever.
export function releaseBudget(buffer: UndoBuffer): void {
  const at = budgetSharers.indexOf(buffer);
  if (at !== -1) {
    budgetSharers.splice(at, 1);
  }
}

// What the Preferences readout reports. The pages of one document draw from one
// pool rather than a budget each, so the number that matters is the total.
// Summed over the handful of histories rather than kept as a second running
// total, which could drift from the totals it duplicates.
export function totalUndoBytes(): number {
  return budgetSharers.reduce((bytes, buffer) => bytes + buffer.getTotalBytes(), 0);
}

// Everything the budget covers except this buffer, which counts its own bytes
// directly. An unregistered buffer therefore sees exactly its own total, which
// is what makes the limits testable in isolation.
function bytesInOtherHistories(self: UndoBuffer): number {
  return budgetSharers.reduce(
    (bytes, buffer) => (buffer === self ? bytes : bytes + buffer.getTotalBytes()),
    0
  );
}

// A single page's history. Instantiable rather than a bare singleton because
// each page of the document owns one; PageStore.currentHistory() is the page on
// screen's, which is the one undo, redo and setUndoPoint work on.
export class UndoBuffer {
  constructor() {
    this.undoBuffer = [];
    this.totalBytes = 0;
  }
  undoBuffer: UndoEntry[];
  // maintained incrementally rather than summed on demand. This is read on
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

  // Rewrites one entry in place, keeping the byte total right. Not an edit to
  // the history: conforming a page to a changed palette keeps its pixels
  // meaning what they already meant, so it replaces the entry rather than
  // appending a step to undo. Older entries keep the palettes they were taken
  // under, which is what lets undo cross a palette change at all.
  replaceItem(index: number | null, entry: UndoEntry): void {
    if (index === null || !this.undoBuffer[index]) {
      return;
    }
    this.totalBytes -= entryBytes(this.undoBuffer[index]);
    this.undoBuffer[index] = entry;
    this.totalBytes += entryBytes(entry);
  }

  // Appends after currentIndex, discarding any redo future beyond it, then
  // evicts from the oldest end until the limits are met, and returns the index
  // the entry ended up at. The caller passes its index in and takes the new one
  // back because eviction shifts every survivor down. One place owns both the
  // array and the index, so they cannot disagree.
  push(entry: UndoEntry, currentIndex: number | null): number {
    const keep = currentIndex === null ? 0 : currentIndex + 1;
    for (let i = keep; i < this.undoBuffer.length; i++) {
      this.totalBytes -= entryBytes(this.undoBuffer[i]);
    }
    this.undoBuffer.length = keep;

    this.undoBuffer.push(entry);
    this.totalBytes += entryBytes(entry);

    // The entry cap is this buffer's own (a page does not hoard history nobody
    // wants); the byte budget is shared, so what the other pages hold counts
    // against what this one may keep.
    const otherBytes = bytesInOtherHistories(this);
    while (
      this.undoBuffer.length > MIN_UNDO_LEVELS &&
      (this.undoBuffer.length > MAX_UNDO_ENTRIES || this.totalBytes + otherBytes > MAX_UNDO_BYTES)
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
