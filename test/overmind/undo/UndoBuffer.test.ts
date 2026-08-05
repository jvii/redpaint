import { describe, expect, test, beforeEach } from 'vitest';
import {
  createUndoEntry,
  toCanvasColorIndex,
  undoBuffer,
  UndoEntry,
  MAX_UNDO_ENTRIES,
  MAX_UNDO_BYTES,
  MIN_UNDO_LEVELS,
  undoLevelsForCanvas,
} from '../../../src/overmind/undo/UndoBuffer';
import { CanvasColorIndex } from '../../../src/domain/CanvasColorIndex';

// The buffer is a module singleton (like the app's), so each test starts by
// clearing it rather than constructing its own.
beforeEach((): void => {
  undoBuffer.clear();
});

function entry(width: number, height: number): UndoEntry {
  return createUndoEntry(CanvasColorIndex.createEmptyWithBackgroundColor(width, height, 1), []);
}

// What a true-colour snapshot costs: 4 bytes per pixel, the texture's own
// layout, and the size that makes the byte budget necessary in the first place.
const bytesFor = (width: number, height: number): number => width * height * 4;
// What an indexed one costs, which is what createUndoEntry stores whenever the
// picture allows it.
const packedBytesFor = (width: number, height: number): number => width * height;

// The eviction tests need entries of realistic size (tens of MB), which is far
// too much to actually allocate — and pointlessly, since the buffer only ever
// asks an entry for its raster's byteLength. So those tests use a stub that
// reports a size without holding one; the tests above use real canvases.
function sizedEntry(bytes: number): UndoEntry {
  return {
    palette: [],
    width: bytes,
    height: 1,
    packed: true,
    pixels: { byteLength: bytes } as unknown as Uint8Array,
  };
}

describe('push', () => {
  test('appends and returns the new index', () => {
    expect(undoBuffer.push(entry(2, 2), null)).toBe(0);
    expect(undoBuffer.push(entry(2, 2), 0)).toBe(1);
    expect(undoBuffer.push(entry(2, 2), 1)).toBe(2);
    expect(undoBuffer.getBuffer()).toHaveLength(3);
  });

  test('discards the redo future beyond currentIndex', () => {
    undoBuffer.push(entry(2, 2), null);
    undoBuffer.push(entry(2, 2), 0);
    undoBuffer.push(entry(2, 2), 1);

    // as if the user undid twice, back to index 0, then drew
    expect(undoBuffer.push(entry(2, 2), 0)).toBe(1);
    expect(undoBuffer.getBuffer()).toHaveLength(2);
  });

  test('reclaims the bytes of the discarded future', () => {
    undoBuffer.push(entry(4, 4), null);
    undoBuffer.push(entry(4, 4), 0);
    undoBuffer.push(entry(4, 4), 1);
    expect(undoBuffer.getTotalBytes()).toBe(3 * packedBytesFor(4, 4));

    undoBuffer.push(entry(4, 4), 0);
    expect(undoBuffer.getTotalBytes()).toBe(2 * packedBytesFor(4, 4));
  });

  test('tracks total bytes across a resize', () => {
    undoBuffer.push(entry(2, 2), null);
    undoBuffer.push(entry(8, 8), 0);
    expect(undoBuffer.getTotalBytes()).toBe(packedBytesFor(2, 2) + packedBytesFor(8, 8));
  });
});

describe('packing', () => {
  test('an indexed picture costs one byte a pixel', () => {
    undoBuffer.push(entry(16, 16), null);
    expect(undoBuffer.getTotalBytes()).toBe(packedBytesFor(16, 16));
    expect(undoBuffer.getItem(0)?.packed).toBe(true);
  });

  test('a true-colour picture keeps all four', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(16, 16, 1);
    canvas.setPixel32(
      { x: 3, y: 3 },
      CanvasColorIndex.packPaintColor({ kind: 'rgb', color: { r: 9, g: 9, b: 9 } })
    );
    undoBuffer.push(createUndoEntry(canvas, []), null);
    expect(undoBuffer.getTotalBytes()).toBe(bytesFor(16, 16));
    expect(undoBuffer.getItem(0)?.packed).toBe(false);
  });

  test('unpacks to the same pixels it was given', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(4, 3, 1);
    canvas.setPixel32({ x: 0, y: 0 }, CanvasColorIndex.packIndexed(7));
    canvas.setPixel32({ x: 3, y: 2 }, CanvasColorIndex.packIndexed(12));
    const restored = toCanvasColorIndex(createUndoEntry(canvas, []));
    expect(restored.width).toBe(4);
    expect(restored.height).toBe(3);
    expect([...restored.indexArray]).toEqual([...canvas.indexArray]);
  });

  // The unpacked path rebuilds a wrapper around the entry's own bytes rather
  // than handing back the canvas it was given, so it is worth stating that it
  // still comes back as the same raster.
  test('a true-colour entry unpacks to the same pixels too', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(4, 3, 1);
    canvas.setPixel32(
      { x: 1, y: 1 },
      CanvasColorIndex.packPaintColor({ kind: 'rgb', color: { r: 9, g: 9, b: 9 } })
    );
    const entry = createUndoEntry(canvas, []);
    expect(entry.packed).toBe(false);
    const restored = toCanvasColorIndex(entry);
    expect(restored.width).toBe(4);
    expect(restored.height).toBe(3);
    expect([...restored.indexArray]).toEqual([...canvas.indexArray]);
  });
});

describe('eviction', () => {
  test('caps the entry count, keeping the newest', () => {
    let index: number | null = null;
    for (let i = 0; i < MAX_UNDO_ENTRIES + 20; i++) {
      index = undoBuffer.push(entry(2, 2), index);
    }
    expect(undoBuffer.getBuffer()).toHaveLength(MAX_UNDO_ENTRIES);
    // the returned index still addresses the entry just pushed, even though
    // eviction shifted everything down
    expect(index).toBe(MAX_UNDO_ENTRIES - 1);
    expect(undoBuffer.getItem(index)).toBe(undoBuffer.getBuffer()[MAX_UNDO_ENTRIES - 1]);
  });

  test('caps total bytes before the entry count is reached', () => {
    // an entry big enough that a handful busts the budget, while the count
    // stays well under MAX_UNDO_ENTRIES — a large canvas in Native mode
    const perEntry = bytesFor(2560, 1600); // ~16 MB
    const affordable = Math.floor(MAX_UNDO_BYTES / perEntry);
    expect(affordable).toBeLessThan(MAX_UNDO_ENTRIES);
    expect(affordable).toBeGreaterThan(MIN_UNDO_LEVELS);

    let index: number | null = null;
    for (let i = 0; i < affordable + 3; i++) {
      index = undoBuffer.push(sizedEntry(perEntry), index);
    }

    expect(undoBuffer.getTotalBytes()).toBeLessThanOrEqual(MAX_UNDO_BYTES);
    expect(undoBuffer.getBuffer()).toHaveLength(affordable);
    expect(index).toBe(affordable - 1);
  });

  test('keeps MIN_UNDO_LEVELS even when they exceed the byte budget', () => {
    // one entry alone busts the whole budget
    const perEntry = MAX_UNDO_BYTES * 2;

    let index: number | null = null;
    for (let i = 0; i < MIN_UNDO_LEVELS + 5; i++) {
      index = undoBuffer.push(sizedEntry(perEntry), index);
    }

    expect(undoBuffer.getBuffer()).toHaveLength(MIN_UNDO_LEVELS);
    expect(undoBuffer.getTotalBytes()).toBeGreaterThan(MAX_UNDO_BYTES);
    expect(index).toBe(MIN_UNDO_LEVELS - 1);
  });
});

describe('undoLevelsForCanvas', () => {
  test('gives the full history at every Amiga screen format', () => {
    for (const [w, h] of [
      [320, 200],
      [320, 256],
      [640, 400],
      [640, 512],
    ]) {
      expect(undoLevelsForCanvas(w, h)).toBe(MAX_UNDO_ENTRIES);
    }
  });

  test('is trimmed by the byte budget on a large canvas', () => {
    const levels = undoLevelsForCanvas(3000, 2000); // 24 MB per entry
    expect(levels).toBeLessThan(MAX_UNDO_ENTRIES);
    expect(levels).toBeGreaterThan(MIN_UNDO_LEVELS);
    expect(levels * bytesFor(3000, 2000)).toBeLessThanOrEqual(MAX_UNDO_BYTES);
  });

  test('never drops below the floor, however large the canvas', () => {
    expect(undoLevelsForCanvas(8000, 8000)).toBe(MIN_UNDO_LEVELS);
  });

  test('agrees with what the buffer actually holds', () => {
    const w = 2560;
    const h = 1600;
    let index: number | null = null;
    for (let i = 0; i < MAX_UNDO_ENTRIES; i++) {
      index = undoBuffer.push(sizedEntry(bytesFor(w, h)), index);
    }
    expect(undoBuffer.getBuffer()).toHaveLength(undoLevelsForCanvas(w, h));
  });

  test('treats an uninitialized canvas as unconstrained', () => {
    expect(undoLevelsForCanvas(0, 0)).toBe(MAX_UNDO_ENTRIES);
  });
});

describe('clear', () => {
  test('empties the buffer and its byte total', () => {
    undoBuffer.push(entry(4, 4), null);
    undoBuffer.push(entry(4, 4), 0);
    undoBuffer.clear();
    expect(undoBuffer.getBuffer()).toHaveLength(0);
    expect(undoBuffer.getTotalBytes()).toBe(0);
    expect(undoBuffer.getItem(null)).toBeNull();
  });
});
