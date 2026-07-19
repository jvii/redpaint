# IFF/ILBM Load & Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open and save Amiga IFF ILBM images (the native Deluxe Paint format), palette and color-cycle ranges included.

**Architecture:** A new pure, zero-dependency codec layer `src/fileformat/` (IFF container → ByteRun1 RLE → planar↔chunky bit conversion → ILBM decode/encode), unit-tested like `src/algorithm/`. Loading bypasses the color-treatment requester — an ILBM is already indexed and carries its own palette — and commits through the exact same pipeline as `ImageLoadDialog.handleOk`'s `'new'` mode: `replacePalette` → `CanvasColorIndex.fromIndexedPixels` → `setPendingCanvasContent` → `setResolution`. Saving reads `getCanvasColorIndex()`, refuses hybrid (true-color) canvases, and reuses the generalized save-file-picker flow in `Menubar.tsx`.

**Tech Stack:** TypeScript, Vitest, DataView/Uint8Array. No new dependencies (same spirit as the hand-rolled PNG codec in `test/png.ts`).

## Global Constraints

- **No new runtime dependencies.** The codec is hand-rolled.
- **`src/fileformat/` stays pure**: no DOM, no Overmind, no WebGL imports — same testability rule as `src/algorithm/` (see CLAUDE.md).
- **Tests mirror `src/` under `test/`**: codec tests go in `test/fileformat/`, importing `{ describe, expect, test } from 'vitest'`.
- **Every commit passes** `npm test`, `npm run lint`, and `npm run build` (which type-checks).
- **Prettier config applies**: 100-column width, single quotes, ES5 trailing commas.
- **v1 scope**: indexed ILBM 1–8 bitplanes (incl. EHB) and PBM (DPaint PC chunky variant), ByteRun1 or uncompressed. HAM and 24-bit deep ILBM are rejected with a clear `IlbmError` — decoding them to true-color pixels is future work (see bottom).
- **Byte order**: IFF is big-endian throughout. All multi-byte reads/writes go through `DataView` (never `Uint16Array`/`Uint32Array` views, which are little-endian on x86).

## Format primer (context for all tasks)

An IFF file is `FORM` + big-endian u32 size + a 4-char form type (`ILBM` or `PBM `), followed by chunks: 4-char id + u32 size + data, each padded to an **even** length (pad byte not counted in the stored size). ILBM chunks we care about:

- **BMHD** (20 bytes): `w:u16@0, h:u16@2, x:i16@4, y:i16@6, nPlanes:u8@8, masking:u8@9, compression:u8@10, pad@11, transparentColor:u16@12, xAspect:u8@14, yAspect:u8@15, pageWidth:i16@16, pageHeight:i16@18`. masking 1 = an extra mask bitplane is interleaved in BODY. compression 0 = none, 1 = ByteRun1.
- **CMAP**: 3 bytes RGB per palette register. Pre-AGA writers stored 4-bit values shifted into the high nibble (low nibble always 0) — detect and expand with `v | v >> 4`.
- **CAMG** (u32, optional): Amiga viewport mode. Flags: `0x800` HAM (reject in v1), `0x80` Extra-Half-Brite (palette doubles to 64: entries 32–63 are entries 0–31 at half brightness).
- **BODY**: rows top-down; each row is `nPlanes` consecutive plane-rows (+ 1 mask row if masking = 1), each plane-row padded to a 16-bit word: `rowBytes = ((w + 15) >> 4) << 1`. Bit 7 of a plane byte = leftmost pixel; plane *p* contributes bit *p* of the pixel's palette index. ByteRun1 compresses each plane-row independently, but rows are stored back-to-back so a continuous decode to the known total length handles all files. `PBM ` BODY is chunky instead: 1 byte per pixel, rows padded to even width.
- **CRNG** (8 bytes, repeatable — DPaint color-cycle range): `pad:u16@0, rate:u16@2` (16384 = 60 steps/s), `flags:u16@4` (1 = active, 2 = reverse), `low:u8@6, high:u8@7` (palette positions, 0-based).
- Chunks to skip silently by size: `GRAB`, `DPPS`, `DPI `, `TINY`, `ANNO`, `AUTH`, `DEST`, `SPRT`, anything unknown.

**Coordinate/index mapping to redpaint:** decoded ILBM pixels are 0-based palette positions in top-down row order — exactly what `CanvasColorIndex.fromIndexedPixels(width, height, indices)` takes (it does the bottom-up texture flip itself). The app's color *numbers* are 1-based (`replacePalette` maps array position 0 → id `"1"`); the 0↔1 conversion already lives at those two boundaries, so the codec never touches it.

## File structure

- Create `src/fileformat/iff.ts` — IFF container read/write (generic, knows nothing about ILBM)
- Create `src/fileformat/byteRun1.ts` — ByteRun1 (PackBits-style) pack/unpack
- Create `src/fileformat/planar.ts` — planar↔chunky row conversion + `bytesPerPlaneRow`
- Create `src/fileformat/ilbm.ts` — `decodeIlbm`/`encodeIlbm`/`IlbmImage`/`IlbmError` (uses the three above)
- Modify `src/domain/CanvasColorIndex.ts` — add `toIndexedPixels()` (export-side mirror of `fromIndexedPixels`)
- Modify `src/overmind/app/actions.ts` — add `beginIlbmLoad`
- Modify `src/components/menubar/MenuItemOpen.tsx` — optional `accept` prop
- Modify `src/components/menubar/Menubar.tsx` — IFF sniffing on open; generalize `saveCanvasAsPng` → `saveFile`; add "Save ILBM…" menu item
- Tests: `test/fileformat/{iff,byteRun1,planar,ilbm}.test.ts`, `test/domain/CanvasColorIndex.test.ts`

---

### Task 1: IFF container reader/writer

**Files:**
- Create: `src/fileformat/iff.ts`
- Test: `test/fileformat/iff.test.ts`

**Interfaces:**
- Produces: `interface IffChunk { id: string; data: Uint8Array }`, `interface IffForm { formType: string; chunks: IffChunk[] }`, `readForm(bytes: Uint8Array): IffForm` (throws `Error` on non-IFF/truncated input), `writeForm(formType: string, chunks: IffChunk[]): Uint8Array`. Tasks 4–5 consume all of these.

- [ ] **Step 1: Write the failing test**

```ts
// test/fileformat/iff.test.ts
import { describe, expect, test } from 'vitest';
import { readForm, writeForm, IffChunk } from '../../src/fileformat/iff';

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}

describe('readForm', () => {
  test('parses a FORM with two chunks, honoring even padding', () => {
    // FORM size 26: 'TEST' + chunk 'AAAA' (3 bytes data + 1 pad) + chunk 'BBBB' (2 bytes)
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 26,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 3, 1, 2, 3, 0, // odd size -> pad byte
      ...ascii('BBBB'), 0, 0, 0, 2, 9, 8,
    ]);
    const form = readForm(bytes);
    expect(form.formType).toBe('TEST');
    expect(form.chunks).toHaveLength(2);
    expect(form.chunks[0].id).toBe('AAAA');
    expect([...form.chunks[0].data]).toEqual([1, 2, 3]);
    expect(form.chunks[1].id).toBe('BBBB');
    expect([...form.chunks[1].data]).toEqual([9, 8]);
  });

  test('throws on a non-IFF file', () => {
    expect(() => readForm(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toThrow();
    expect(() => readForm(new Uint8Array(ascii('FORM')))).toThrow(); // too short
  });

  test('throws on a chunk whose stored size overruns the file', () => {
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 16,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 99, 1, 2, 3, 4,
    ]);
    expect(() => readForm(bytes)).toThrow(/truncated/i);
  });
});

describe('writeForm', () => {
  test('round-trips through readForm, padding odd chunks', () => {
    const chunks: IffChunk[] = [
      { id: 'AAAA', data: new Uint8Array([1, 2, 3]) },
      { id: 'BBBB', data: new Uint8Array([9, 8]) },
    ];
    const bytes = writeForm('TEST', chunks);
    expect(bytes.length % 2).toBe(0);
    const form = readForm(bytes);
    expect(form.formType).toBe('TEST');
    expect(form.chunks.map((c) => c.id)).toEqual(['AAAA', 'BBBB']);
    expect([...form.chunks[0].data]).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fileformat/iff.test.ts`
Expected: FAIL — cannot resolve `../../src/fileformat/iff`

- [ ] **Step 3: Write the implementation**

```ts
// src/fileformat/iff.ts
// IFF-85 container (EA 1985) reading/writing — the envelope around ILBM and
// friends. Big-endian throughout; every chunk is padded to an even length
// (the pad byte is not counted in the chunk's stored size). This layer knows
// nothing about what the chunks mean.

export interface IffChunk {
  id: string; // 4 ASCII characters
  data: Uint8Array; // chunk contents, without the pad byte
}

export interface IffForm {
  formType: string; // e.g. 'ILBM', 'PBM '
  chunks: IffChunk[];
}

export function readForm(bytes: Uint8Array): IffForm {
  if (bytes.length < 12 || readId(bytes, 0) !== 'FORM') {
    throw new Error('Not an IFF file (missing FORM header)');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const formSize = view.getUint32(4); // bytes after the size field: formType + chunks
  const formType = readId(bytes, 8);
  const end = Math.min(8 + formSize, bytes.length);

  const chunks: IffChunk[] = [];
  let offset = 12;
  while (offset + 8 <= end) {
    const id = readId(bytes, offset);
    const size = view.getUint32(offset + 4);
    if (offset + 8 + size > bytes.length) {
      throw new Error(`Truncated IFF chunk ${id}`);
    }
    chunks.push({ id, data: bytes.subarray(offset + 8, offset + 8 + size) });
    offset += 8 + size + (size & 1); // skip the pad byte after odd-sized chunks
  }
  return { formType, chunks };
}

export function writeForm(formType: string, chunks: IffChunk[]): Uint8Array {
  const parts = chunks.map(writeChunk);
  const contentSize = 4 + parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(8 + contentSize);
  writeId(out, 0, 'FORM');
  new DataView(out.buffer).setUint32(4, contentSize);
  writeId(out, 8, formType);
  let offset = 12;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function writeChunk(chunk: IffChunk): Uint8Array {
  const size = chunk.data.length;
  const out = new Uint8Array(8 + size + (size & 1)); // trailing pad byte if odd
  writeId(out, 0, chunk.id);
  new DataView(out.buffer).setUint32(4, size);
  out.set(chunk.data, 8);
  return out;
}

function readId(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function writeId(bytes: Uint8Array, offset: number, id: string): void {
  for (let i = 0; i < 4; i++) {
    bytes[offset + i] = id.charCodeAt(i);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fileformat/iff.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/fileformat/iff.ts test/fileformat/iff.test.ts
git commit -m "Add IFF-85 container reader/writer"
```

---

### Task 2: ByteRun1 pack/unpack

**Files:**
- Create: `src/fileformat/byteRun1.ts`
- Test: `test/fileformat/byteRun1.test.ts`

**Interfaces:**
- Produces: `unpackByteRun1(src: Uint8Array, unpackedLength: number): Uint8Array` (throws on truncated input), `packByteRun1(src: Uint8Array): Uint8Array`. Tasks 4–5 consume both.

- [ ] **Step 1: Write the failing test**

```ts
// test/fileformat/byteRun1.test.ts
import { describe, expect, test } from 'vitest';
import { packByteRun1, unpackByteRun1 } from '../../src/fileformat/byteRun1';

describe('unpackByteRun1', () => {
  test('decodes literal runs (n >= 0: copy n+1 bytes)', () => {
    expect([...unpackByteRun1(new Uint8Array([2, 10, 20, 30]), 3)]).toEqual([10, 20, 30]);
  });

  test('decodes replicate runs (n < 0: repeat next byte 1-n times)', () => {
    // -3 as unsigned byte is 253 -> repeat 4 times
    expect([...unpackByteRun1(new Uint8Array([253, 7]), 4)]).toEqual([7, 7, 7, 7]);
  });

  test('skips the -128 no-op code', () => {
    expect([...unpackByteRun1(new Uint8Array([128, 0, 5]), 1)]).toEqual([5]);
  });

  test('decodes mixed literal and replicate runs', () => {
    // [1, 2] literal, then 3x9
    const packed = new Uint8Array([1, 1, 2, 254, 9]);
    expect([...unpackByteRun1(packed, 5)]).toEqual([1, 2, 9, 9, 9]);
  });

  test('throws when the stream ends before unpackedLength is reached', () => {
    expect(() => unpackByteRun1(new Uint8Array([2, 10, 20]), 5)).toThrow(/truncated/i);
  });
});

describe('packByteRun1', () => {
  test('packs a run of equal bytes as a replicate', () => {
    expect([...packByteRun1(new Uint8Array([7, 7, 7, 7]))]).toEqual([253, 7]);
  });

  test('packs distinct bytes as a literal', () => {
    expect([...packByteRun1(new Uint8Array([1, 2, 3]))]).toEqual([2, 1, 2, 3]);
  });

  test('round-trips arbitrary data, including runs longer than 128', () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i++) {
      data[i] = i < 300 ? 42 : (i * 31) & 0xff; // long run, then noise
    }
    const packed = packByteRun1(data);
    expect([...unpackByteRun1(packed, data.length)]).toEqual([...data]);
    expect(packed.length).toBeLessThan(data.length);
  });

  test('round-trips the empty array', () => {
    expect(packByteRun1(new Uint8Array(0)).length).toBe(0);
    expect(unpackByteRun1(new Uint8Array(0), 0).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fileformat/byteRun1.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 3: Write the implementation**

```ts
// src/fileformat/byteRun1.ts
// ByteRun1 run-length coding (the ILBM spec's compression = 1; the same
// scheme as Mac PackBits). Control byte n as signed: 0..127 copy the next
// n+1 bytes literally; -1..-127 repeat the next byte 1-n times; -128 no-op.

export function unpackByteRun1(src: Uint8Array, unpackedLength: number): Uint8Array {
  const out = new Uint8Array(unpackedLength);
  let s = 0;
  let d = 0;
  while (d < unpackedLength && s < src.length) {
    const n = (src[s++] << 24) >> 24; // sign-extend the control byte
    if (n >= 0) {
      for (let i = 0; i <= n && s < src.length && d < unpackedLength; i++) {
        out[d++] = src[s++];
      }
    } else if (n !== -128) {
      const value = src[s++];
      for (let i = 0; i < 1 - n && d < unpackedLength; i++) {
        out[d++] = value;
      }
    }
  }
  if (d < unpackedLength) {
    throw new Error('Truncated ByteRun1 data');
  }
  return out;
}

export function packByteRun1(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < src.length) {
    // measure the run of equal bytes starting here (capped at 128)
    let runEnd = i + 1;
    while (runEnd < src.length && runEnd - i < 128 && src[runEnd] === src[i]) {
      runEnd++;
    }
    if (runEnd - i >= 3) {
      out.push(257 - (runEnd - i), src[i]); // -(runLength-1) as an unsigned byte
      i = runEnd;
      continue;
    }
    // literal block: until a run of 3+ starts, or 128 bytes
    let litEnd = i + 1;
    while (
      litEnd < src.length &&
      litEnd - i < 128 &&
      !(litEnd + 2 < src.length && src[litEnd] === src[litEnd + 1] && src[litEnd] === src[litEnd + 2])
    ) {
      litEnd++;
    }
    out.push(litEnd - i - 1);
    for (let j = i; j < litEnd; j++) {
      out.push(src[j]);
    }
    i = litEnd;
  }
  return new Uint8Array(out);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fileformat/byteRun1.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/fileformat/byteRun1.ts test/fileformat/byteRun1.test.ts
git commit -m "Add ByteRun1 RLE pack/unpack"
```

---

### Task 3: Planar↔chunky conversion

**Files:**
- Create: `src/fileformat/planar.ts`
- Test: `test/fileformat/planar.test.ts`

**Interfaces:**
- Produces: `bytesPerPlaneRow(width: number): number`, `planarRowToChunky(row: Uint8Array, width: number, nPlanes: number): Uint8Array` (row = `nPlanes * rowBytes` bytes → `width` pixel indices), `chunkyRowToPlanar(pixels: Uint8Array, nPlanes: number): Uint8Array` (inverse). Tasks 4–5 consume all three.

- [ ] **Step 1: Write the failing test**

```ts
// test/fileformat/planar.test.ts
import { describe, expect, test } from 'vitest';
import { bytesPerPlaneRow, chunkyRowToPlanar, planarRowToChunky } from '../../src/fileformat/planar';

describe('bytesPerPlaneRow', () => {
  test('pads each plane row to a 16-bit word', () => {
    expect(bytesPerPlaneRow(1)).toBe(2);
    expect(bytesPerPlaneRow(16)).toBe(2);
    expect(bytesPerPlaneRow(17)).toBe(4);
    expect(bytesPerPlaneRow(320)).toBe(40);
  });
});

describe('planarRowToChunky', () => {
  test('reassembles pixel indices from bitplanes (bit 7 = leftmost pixel)', () => {
    // width 4, 2 planes, pixels [0, 1, 2, 3]:
    // plane 0 (bit 0 of each index): 0,1,0,1 -> 0b01010000
    // plane 1 (bit 1 of each index): 0,0,1,1 -> 0b00110000
    const row = new Uint8Array([0b01010000, 0, 0b00110000, 0]); // 2 bytes per plane row
    expect([...planarRowToChunky(row, 4, 2)]).toEqual([0, 1, 2, 3]);
  });

  test('handles widths that cross byte boundaries', () => {
    // width 9, 1 plane: pixel 8 is bit 7 of the second byte
    const row = new Uint8Array([0b10000001, 0b10000000]);
    const pixels = planarRowToChunky(row, 9, 1);
    expect(pixels[0]).toBe(1);
    expect(pixels[7]).toBe(1);
    expect(pixels[8]).toBe(1);
    expect([...pixels].filter((v) => v === 1)).toHaveLength(3);
  });
});

describe('chunkyRowToPlanar', () => {
  test('is the inverse of planarRowToChunky for all 8 planes', () => {
    const width = 21; // odd width, padded row
    const pixels = new Uint8Array(width);
    for (let x = 0; x < width; x++) {
      pixels[x] = (x * 37) & 0xff;
    }
    const planar = chunkyRowToPlanar(pixels, 8);
    expect(planar.length).toBe(8 * bytesPerPlaneRow(width));
    expect([...planarRowToChunky(planar, width, 8)]).toEqual([...pixels]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fileformat/planar.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 3: Write the implementation**

```ts
// src/fileformat/planar.ts
// Amiga bitplane ("planar") <-> one-byte-per-pixel ("chunky") conversion.
// An ILBM BODY row is nPlanes consecutive plane rows, each padded to a
// 16-bit word boundary. Bit 7 of a plane byte is the leftmost pixel of that
// byte's 8 pixels; plane p contributes bit p of a pixel's palette index.

export function bytesPerPlaneRow(width: number): number {
  return ((width + 15) >> 4) << 1;
}

export function planarRowToChunky(row: Uint8Array, width: number, nPlanes: number): Uint8Array {
  const rowBytes = bytesPerPlaneRow(width);
  const out = new Uint8Array(width);
  for (let p = 0; p < nPlanes; p++) {
    const planeOffset = p * rowBytes;
    const bit = 1 << p;
    for (let x = 0; x < width; x++) {
      if (row[planeOffset + (x >> 3)] & (0x80 >> (x & 7))) {
        out[x] |= bit;
      }
    }
  }
  return out;
}

export function chunkyRowToPlanar(pixels: Uint8Array, nPlanes: number): Uint8Array {
  const rowBytes = bytesPerPlaneRow(pixels.length);
  const out = new Uint8Array(nPlanes * rowBytes);
  for (let x = 0; x < pixels.length; x++) {
    const value = pixels[x];
    const byteOffset = x >> 3;
    const bit = 0x80 >> (x & 7);
    for (let p = 0; p < nPlanes; p++) {
      if (value & (1 << p)) {
        out[p * rowBytes + byteOffset] |= bit;
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fileformat/planar.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/fileformat/planar.ts test/fileformat/planar.test.ts
git commit -m "Add planar/chunky bitplane conversion"
```

---

### Task 4: ILBM decoder

**Files:**
- Create: `src/fileformat/ilbm.ts`
- Test: `test/fileformat/ilbm.test.ts`

**Interfaces:**
- Consumes: `readForm`/`IffChunk` (Task 1), `unpackByteRun1` (Task 2), `bytesPerPlaneRow`/`planarRowToChunky` (Task 3), `Color` from `src/types.ts`.
- Produces (Tasks 5, 7, 8 rely on these exact shapes):

```ts
export interface IlbmCycleRange { low: number; high: number; rate: number; active: boolean; reverse: boolean }
export interface IlbmImage {
  width: number;
  height: number;
  palette: Color[]; // padded to 2^nPlanes entries
  pixels: Uint8Array; // width*height 0-based palette positions, rows top-down
  cycleRanges: IlbmCycleRange[];
}
export class IlbmError extends Error { reason: 'not-iff' | 'unsupported' | 'corrupt' }
export function decodeIlbm(bytes: Uint8Array): IlbmImage
```

- [ ] **Step 1: Write the failing test**

```ts
// test/fileformat/ilbm.test.ts
import { describe, expect, test } from 'vitest';
import { decodeIlbm, IlbmError } from '../../src/fileformat/ilbm';
import { writeForm, IffChunk } from '../../src/fileformat/iff';

// BMHD builder: only the fields the tests vary
function bmhd(opts: {
  w: number; h: number; nPlanes: number; masking?: number; compression?: number;
}): IffChunk {
  const data = new Uint8Array(20);
  const v = new DataView(data.buffer);
  v.setUint16(0, opts.w);
  v.setUint16(2, opts.h);
  data[8] = opts.nPlanes;
  data[9] = opts.masking ?? 0;
  data[10] = opts.compression ?? 0;
  return { id: 'BMHD', data };
}

function cmap(colors: number[][]): IffChunk {
  return { id: 'CMAP', data: new Uint8Array(colors.flat()) };
}

function camg(mode: number): IffChunk {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, mode);
  return { id: 'CAMG', data };
}

describe('decodeIlbm', () => {
  test('decodes an uncompressed 4x1 2-plane ILBM built byte-by-byte', () => {
    // pixels [0,1,2,3]: plane 0 row = 0b01010000, plane 1 row = 0b00110000
    const body: IffChunk = { id: 'BODY', data: new Uint8Array([0x50, 0, 0x30, 0]) };
    const bytes = writeForm('ILBM', [
      bmhd({ w: 4, h: 1, nPlanes: 2 }),
      cmap([[0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 0, 255]]),
      body,
    ]);
    const image = decodeIlbm(bytes);
    expect(image.width).toBe(4);
    expect(image.height).toBe(1);
    expect([...image.pixels]).toEqual([0, 1, 2, 3]);
    expect(image.palette[1]).toEqual({ r: 255, g: 255, b: 255 });
    expect(image.palette[3]).toEqual({ r: 0, g: 0, b: 255 });
    expect(image.palette).toHaveLength(4); // padded to 2^nPlanes
  });

  test('scales 4-bit CMAP values (all low nibbles zero) to 8-bit', () => {
    const body: IffChunk = { id: 'BODY', data: new Uint8Array([0x50, 0]) };
    const bytes = writeForm('ILBM', [
      bmhd({ w: 4, h: 1, nPlanes: 1 }),
      cmap([[0x00, 0x70, 0xf0], [0x20, 0x00, 0x90]]),
      body,
    ]);
    const image = decodeIlbm(bytes);
    expect(image.palette[0]).toEqual({ r: 0x00, g: 0x77, b: 0xff });
    expect(image.palette[1]).toEqual({ r: 0x22, g: 0x00, b: 0x99 });
  });

  test('expands an Extra-Half-Brite palette to 64 colors', () => {
    const rows: number[] = [];
    for (let p = 0; p < 6; p++) rows.push(0, 0); // 16-wide, all pixels index 0
    const body: IffChunk = { id: 'BODY', data: new Uint8Array(rows) };
    const colors = Array.from({ length: 32 }, (_, i) => [i * 8 + 1, 0, 0]); // low nibbles nonzero
    const bytes = writeForm('ILBM', [
      bmhd({ w: 16, h: 1, nPlanes: 6 }),
      camg(0x80),
      cmap(colors),
      body,
    ]);
    const image = decodeIlbm(bytes);
    expect(image.palette).toHaveLength(64);
    expect(image.palette[33].r).toBe(image.palette[1].r >> 1);
  });

  test('skips the mask plane when masking is 1', () => {
    // 1 plane + 1 mask row per line
    const body: IffChunk = { id: 'BODY', data: new Uint8Array([0x50, 0, 0xff, 0xff]) };
    const bytes = writeForm('ILBM', [
      bmhd({ w: 4, h: 1, nPlanes: 1, masking: 1 }),
      cmap([[0, 0, 0], [255, 255, 255]]),
      body,
    ]);
    expect([...decodeIlbm(bytes).pixels]).toEqual([0, 1, 0, 1]);
  });

  test('decodes the PBM chunky variant', () => {
    const body: IffChunk = { id: 'BODY', data: new Uint8Array([0, 1, 2, 0]) }; // width 3 + pad
    const bytes = writeForm('PBM ', [
      bmhd({ w: 3, h: 1, nPlanes: 8 }),
      cmap([[1, 1, 1], [255, 255, 255], [255, 0, 0]]),
      body,
    ]);
    expect([...decodeIlbm(bytes).pixels]).toEqual([0, 1, 2]);
  });

  test('reads CRNG color-cycle ranges', () => {
    const crng = new Uint8Array(8);
    const v = new DataView(crng.buffer);
    v.setUint16(2, 8192);
    v.setUint16(4, 3); // active + reverse
    crng[6] = 4;
    crng[7] = 12;
    const body: IffChunk = { id: 'BODY', data: new Uint8Array([0x50, 0]) };
    const bytes = writeForm('ILBM', [
      bmhd({ w: 4, h: 1, nPlanes: 1 }),
      cmap([[1, 1, 1], [255, 255, 255]]),
      { id: 'CRNG', data: crng },
      body,
    ]);
    expect(decodeIlbm(bytes).cycleRanges).toEqual([
      { low: 4, high: 12, rate: 8192, active: true, reverse: true },
    ]);
  });

  test('rejects HAM images with an IlbmError', () => {
    const body: IffChunk = { id: 'BODY', data: new Uint8Array(12) };
    const bytes = writeForm('ILBM', [
      bmhd({ w: 16, h: 1, nPlanes: 6 }),
      camg(0x800),
      cmap([[1, 1, 1]]),
      body,
    ]);
    expect(() => decodeIlbm(bytes)).toThrow(IlbmError);
    expect(() => decodeIlbm(bytes)).toThrow(/HAM/);
  });

  test('rejects non-IFF bytes with an IlbmError', () => {
    expect(() => decodeIlbm(new Uint8Array(100))).toThrow(IlbmError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fileformat/ilbm.test.ts`
Expected: FAIL — cannot resolve `../../src/fileformat/ilbm`

- [ ] **Step 3: Write the implementation**

```ts
// src/fileformat/ilbm.ts
// IFF ILBM (the Amiga / Deluxe Paint image format) decode and encode.
// v1 scope: indexed images, 1-8 bitplanes (incl. Extra-Half-Brite) and the
// PBM chunky variant. HAM and 24-bit deep ILBM are rejected — decoding them
// needs the true-color load path and is future work.

import { Color } from '../types';
import { IffChunk, readForm, writeForm } from './iff';
import { packByteRun1, unpackByteRun1 } from './byteRun1';
import { bytesPerPlaneRow, chunkyRowToPlanar, planarRowToChunky } from './planar';

const CAMG_HAM = 0x800;
const CAMG_EHB = 0x80;

export interface IlbmCycleRange {
  low: number; // 0-based palette position, inclusive
  high: number;
  rate: number; // 16384 = 60 steps/second (the DPaint CRNG unit)
  active: boolean;
  reverse: boolean;
}

export interface IlbmImage {
  width: number;
  height: number;
  palette: Color[]; // padded to 2^nPlanes entries so every index resolves
  pixels: Uint8Array; // width*height 0-based palette positions, rows top-down
  cycleRanges: IlbmCycleRange[];
}

export class IlbmError extends Error {
  constructor(
    message: string,
    readonly reason: 'not-iff' | 'unsupported' | 'corrupt'
  ) {
    super(message);
    this.name = 'IlbmError';
  }
}

export function decodeIlbm(bytes: Uint8Array): IlbmImage {
  let form;
  try {
    form = readForm(bytes);
  } catch (error) {
    throw new IlbmError(error instanceof Error ? error.message : 'Not an IFF file', 'not-iff');
  }
  if (form.formType !== 'ILBM' && form.formType !== 'PBM ') {
    throw new IlbmError(`Unsupported IFF form type: ${form.formType}`, 'unsupported');
  }
  const chunk = (id: string): IffChunk | undefined => form.chunks.find((c) => c.id === id);

  const bmhd = chunk('BMHD');
  if (!bmhd || bmhd.data.length < 20) {
    throw new IlbmError('Missing or short BMHD header', 'corrupt');
  }
  const header = new DataView(bmhd.data.buffer, bmhd.data.byteOffset);
  const width = header.getUint16(0);
  const height = header.getUint16(2);
  const nPlanes = bmhd.data[8];
  const masking = bmhd.data[9];
  const compression = bmhd.data[10];
  if (width === 0 || height === 0) {
    throw new IlbmError('Empty image', 'corrupt');
  }
  if (compression > 1) {
    throw new IlbmError(`Unknown compression method ${compression}`, 'unsupported');
  }

  const camgChunk = chunk('CAMG');
  const camg =
    camgChunk && camgChunk.data.length >= 4
      ? new DataView(camgChunk.data.buffer, camgChunk.data.byteOffset).getUint32(0)
      : 0;
  if (camg & CAMG_HAM) {
    throw new IlbmError('HAM (Hold-And-Modify) images are not supported', 'unsupported');
  }
  if (nPlanes < 1 || nPlanes > 8) {
    throw new IlbmError(`${nPlanes}-bitplane images are not supported`, 'unsupported');
  }

  const cmapChunk = chunk('CMAP');
  if (!cmapChunk) {
    throw new IlbmError('Missing CMAP (no palette)', 'unsupported');
  }
  const palette = readCmap(cmapChunk.data, camg, nPlanes);

  const bodyChunk = chunk('BODY');
  if (!bodyChunk) {
    throw new IlbmError('Missing BODY (no pixels)', 'corrupt');
  }
  const pixels =
    form.formType === 'PBM '
      ? decodePbmBody(bodyChunk.data, width, height, compression)
      : decodeIlbmBody(bodyChunk.data, width, height, nPlanes, masking, compression);

  const cycleRanges = form.chunks
    .filter((c) => c.id === 'CRNG' && c.data.length >= 8)
    .map((c): IlbmCycleRange => {
      const v = new DataView(c.data.buffer, c.data.byteOffset);
      const flags = v.getUint16(4);
      return {
        low: c.data[6],
        high: c.data[7],
        rate: v.getUint16(2),
        active: (flags & 1) !== 0,
        reverse: (flags & 2) !== 0,
      };
    });

  return { width, height, palette, pixels, cycleRanges };
}

// CMAP: 3 bytes RGB per register. Pre-AGA writers stored 4-bit color values
// shifted into the high nibble; when every low nibble in the file is zero,
// expand with v | v >> 4 (0xF0 -> 0xFF). An EHB image stores 32 registers;
// the upper 32 are those at half brightness, derived here. The palette is
// padded to 2^nPlanes black entries so any pixel index resolves.
function readCmap(data: Uint8Array, camg: number, nPlanes: number): Color[] {
  const count = Math.min(256, Math.floor(data.length / 3));
  let fourBit = count > 0;
  for (let i = 0; i < count * 3 && fourBit; i++) {
    if ((data[i] & 0x0f) !== 0) {
      fourBit = false;
    }
  }
  const scale = (v: number): number => (fourBit ? v | (v >> 4) : v);
  let palette: Color[] = [];
  for (let i = 0; i < count; i++) {
    palette.push({ r: scale(data[i * 3]), g: scale(data[i * 3 + 1]), b: scale(data[i * 3 + 2]) });
  }
  if (camg & CAMG_EHB && palette.length <= 32) {
    palette = palette.concat(palette.map((c) => ({ r: c.r >> 1, g: c.g >> 1, b: c.b >> 1 })));
  }
  while (palette.length < 1 << nPlanes) {
    palette.push({ r: 0, g: 0, b: 0 });
  }
  return palette;
}

function decodeIlbmBody(
  data: Uint8Array,
  width: number,
  height: number,
  nPlanes: number,
  masking: number,
  compression: number
): Uint8Array {
  const rowBytes = bytesPerPlaneRow(width);
  const rowsPerLine = nPlanes + (masking === 1 ? 1 : 0);
  const totalBytes = height * rowsPerLine * rowBytes;
  // Rows are compressed independently but stored back-to-back, so one
  // continuous decode to the known total length handles every file.
  const unpacked = compression === 1 ? unpackByteRun1(data, totalBytes) : data;
  if (unpacked.length < totalBytes) {
    throw new IlbmError('Truncated BODY', 'corrupt');
  }
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const lineStart = y * rowsPerLine * rowBytes;
    const planeRows = unpacked.subarray(lineStart, lineStart + nPlanes * rowBytes);
    pixels.set(planarRowToChunky(planeRows, width, nPlanes), y * width);
  }
  return pixels;
}

// PBM (DPaint II PC): chunky BODY, one byte per pixel, rows padded to even.
function decodePbmBody(
  data: Uint8Array,
  width: number,
  height: number,
  compression: number
): Uint8Array {
  const rowBytes = width + (width & 1);
  const totalBytes = height * rowBytes;
  const unpacked = compression === 1 ? unpackByteRun1(data, totalBytes) : data;
  if (unpacked.length < totalBytes) {
    throw new IlbmError('Truncated BODY', 'corrupt');
  }
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    pixels.set(unpacked.subarray(y * rowBytes, y * rowBytes + width), y * width);
  }
  return pixels;
}
```

(`packByteRun1`, `chunkyRowToPlanar` and `writeForm` are imported now but used by Task 5's `encodeIlbm` — if the linter flags them as unused, add the imports in Task 5 instead.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fileformat/ilbm.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/fileformat/ilbm.ts test/fileformat/ilbm.test.ts
git commit -m "Add ILBM decoder (indexed + EHB + PBM, ByteRun1)"
```

---

### Task 5: ILBM encoder

**Files:**
- Modify: `src/fileformat/ilbm.ts` (append `encodeIlbm`)
- Test: `test/fileformat/ilbm.test.ts` (append a describe block)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `encodeIlbm(image: Omit<IlbmImage, 'cycleRanges'> & { cycleRanges?: IlbmCycleRange[] }): Uint8Array`. Task 8 consumes it.

- [ ] **Step 1: Write the failing test**

Append to `test/fileformat/ilbm.test.ts`:

```ts
import { encodeIlbm } from '../../src/fileformat/ilbm';

describe('encodeIlbm', () => {
  test('round-trips pixels, palette and cycle ranges through decodeIlbm', () => {
    const width = 37; // odd width exercises row padding
    const height = 23;
    const palette = Array.from({ length: 32 }, (_, i) => ({
      r: (i * 8 + 1) & 0xff, // low nibbles nonzero so the 4-bit heuristic stays off
      g: (255 - i * 7) | 1,
      b: (i * 13) | 1,
    }));
    const pixels = new Uint8Array(width * height);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = (i * 7) % 32;
    }
    const cycleRanges = [{ low: 4, high: 15, rate: 8192, active: true, reverse: false }];

    const decoded = decodeIlbm(encodeIlbm({ width, height, palette, pixels, cycleRanges }));

    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect([...decoded.pixels]).toEqual([...pixels]);
    expect(decoded.palette).toEqual(palette); // 32 colors = 5 planes = no padding needed
    expect(decoded.cycleRanges).toEqual(cycleRanges);
  });

  test('sizes the plane count to the highest pixel index, not just the palette', () => {
    // 4-color palette but a stray index 200 (dropped-slot pixels keep their
    // index in redpaint) must still round-trip
    const pixels = new Uint8Array([0, 1, 2, 200]);
    const palette = [
      { r: 1, g: 1, b: 1 },
      { r: 255, g: 255, b: 255 },
      { r: 255, g: 1, b: 1 },
      { r: 1, g: 1, b: 255 },
    ];
    const decoded = decodeIlbm(encodeIlbm({ width: 4, height: 1, palette, pixels }));
    expect([...decoded.pixels]).toEqual([0, 1, 2, 200]);
    expect(decoded.palette).toHaveLength(256); // padded to 2^8
  });

  test('compresses: a flat image encodes far smaller than raw', () => {
    const width = 320;
    const height = 200;
    const pixels = new Uint8Array(width * height).fill(3);
    const palette = Array.from({ length: 16 }, (_, i) => ({ r: i | 1, g: i | 1, b: i | 1 }));
    const bytes = encodeIlbm({ width, height, palette, pixels });
    expect(bytes.length).toBeLessThan((width * height) / 8);
    expect([...decodeIlbm(bytes).pixels]).toEqual([...pixels]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fileformat/ilbm.test.ts`
Expected: FAIL — `encodeIlbm` is not exported

- [ ] **Step 3: Write the implementation**

Append to `src/fileformat/ilbm.ts`:

```ts
// Encodes an indexed image as a ByteRun1-compressed ILBM. The plane count
// covers the highest pixel index actually present (dropped palette slots
// keep their index in redpaint), and the CMAP is padded to a full 2^nPlanes
// registers, which is what period software expects.
export function encodeIlbm(
  image: Omit<IlbmImage, 'cycleRanges'> & { cycleRanges?: IlbmCycleRange[] }
): Uint8Array {
  const { width, height, palette, pixels } = image;
  let maxIndex = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > maxIndex) {
      maxIndex = pixels[i];
    }
  }
  const registers = Math.max(2, palette.length, maxIndex + 1);
  const nPlanes = Math.ceil(Math.log2(registers));

  const bmhd = new Uint8Array(20);
  const header = new DataView(bmhd.buffer);
  header.setUint16(0, width);
  header.setUint16(2, height);
  bmhd[8] = nPlanes;
  bmhd[9] = 0; // no mask
  bmhd[10] = 1; // ByteRun1
  header.setUint16(12, 0); // transparentColor
  bmhd[14] = 1; // xAspect — square pixels (no screen-mode simulation on export)
  bmhd[15] = 1; // yAspect
  header.setInt16(16, width); // pageWidth/Height: the image is its own page
  header.setInt16(18, height);

  const cmap = new Uint8Array(3 * (1 << nPlanes)); // pad to full registers, black
  palette.forEach((color, i) => {
    cmap[i * 3] = color.r;
    cmap[i * 3 + 1] = color.g;
    cmap[i * 3 + 2] = color.b;
  });

  const rowBytes = bytesPerPlaneRow(width);
  const packedRows: Uint8Array[] = [];
  let bodyLength = 0;
  for (let y = 0; y < height; y++) {
    const planarRow = chunkyRowToPlanar(pixels.subarray(y * width, (y + 1) * width), nPlanes);
    for (let p = 0; p < nPlanes; p++) {
      // per plane-row compression, as the spec prescribes
      const packed = packByteRun1(planarRow.subarray(p * rowBytes, (p + 1) * rowBytes));
      packedRows.push(packed);
      bodyLength += packed.length;
    }
  }
  const body = new Uint8Array(bodyLength);
  let offset = 0;
  for (const row of packedRows) {
    body.set(row, offset);
    offset += row.length;
  }

  const chunks: IffChunk[] = [
    { id: 'BMHD', data: bmhd },
    { id: 'CMAP', data: cmap },
  ];
  for (const range of image.cycleRanges ?? []) {
    const crng = new Uint8Array(8);
    const v = new DataView(crng.buffer);
    v.setUint16(2, range.rate);
    v.setUint16(4, (range.active ? 1 : 0) | (range.reverse ? 2 : 0));
    crng[6] = range.low;
    crng[7] = range.high;
    chunks.push({ id: 'CRNG', data: crng });
  }
  chunks.push({ id: 'BODY', data: body });

  return writeForm('ILBM', chunks);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fileformat/ilbm.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/fileformat/ilbm.ts test/fileformat/ilbm.test.ts
git commit -m "Add ILBM encoder with round-trip tests"
```

---

### Task 6: `CanvasColorIndex.toIndexedPixels()`

**Files:**
- Modify: `src/domain/CanvasColorIndex.ts` (add one method, after `fromIndexedPixels`)
- Test: `test/domain/CanvasColorIndex.test.ts` (new file)

**Interfaces:**
- Produces: `toIndexedPixels(): Uint8Array | null` — the export-side mirror of `fromIndexedPixels`: width*height 0-based palette positions, rows top-down; `null` if any pixel is true-color (the caller decides what to tell the user). Task 8 consumes it.

- [ ] **Step 1: Write the failing test**

```ts
// test/domain/CanvasColorIndex.test.ts
import { describe, expect, test } from 'vitest';
import { CanvasColorIndex } from '../../src/domain/CanvasColorIndex';

describe('toIndexedPixels', () => {
  test('is the inverse of fromIndexedPixels (top-down rows, 0-based indices)', () => {
    const indices = new Uint8Array([0, 1, 2, 3, 4, 5]); // 3x2, distinct per pixel
    const canvas = CanvasColorIndex.fromIndexedPixels(3, 2, indices);
    expect([...(canvas.toIndexedPixels() ?? [])]).toEqual([...indices]);
  });

  test('reads a painted canvas in canvas orientation', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 1);
    // paint canvas-coordinate top-left (0,0) with color number 5 (stored 0-based: 4)
    canvas.setPixel32({ x: 0, y: 0 }, CanvasColorIndex.packIndexed(5));
    const pixels = canvas.toIndexedPixels();
    expect(pixels?.[0]).toBe(4); // first byte = top-left
    expect(pixels?.[3]).toBe(0); // background color 1, stored 0-based
  });

  test('returns null when the canvas has true-color pixels', () => {
    const canvas = CanvasColorIndex.createEmptyWithBackgroundColor(2, 2, 1);
    canvas.setPixel32(
      { x: 1, y: 1 },
      CanvasColorIndex.packPaintColor({ kind: 'rgb', color: { r: 10, g: 20, b: 30 } })
    );
    expect(canvas.toIndexedPixels()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/domain/CanvasColorIndex.test.ts`
Expected: FAIL — `toIndexedPixels is not a function`

- [ ] **Step 3: Write the implementation**

Add to `src/domain/CanvasColorIndex.ts`, directly after `fromIndexedPixels`:

```ts
  // The export-side mirror of fromIndexedPixels: per-pixel 0-based palette
  // positions in top-down row order (texture rows are stored bottom-up, so
  // rows are flipped here). Returns null if any pixel is true color — an
  // indexed export has no representation for those; the caller decides what
  // to tell the user.
  toIndexedPixels(): Uint8Array | null {
    const out = new Uint8Array(this.width * this.height);
    for (let y = 0; y < this.height; y++) {
      const sourceRow = (this.height - 1 - y) * this.width * 4;
      const targetRow = y * this.width;
      for (let x = 0; x < this.width; x++) {
        if (this.indexArray[sourceRow + x * 4 + 3] === ALPHA_TRUECOLOR) {
          return null;
        }
        out[targetRow + x] = this.indexArray[sourceRow + x * 4];
      }
    }
    return out;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/domain/CanvasColorIndex.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Lint, full test run, commit**

```bash
npm run lint && npm test
git add src/domain/CanvasColorIndex.ts test/domain/CanvasColorIndex.test.ts
git commit -m "Add CanvasColorIndex.toIndexedPixels for indexed export"
```

---

### Task 7: Wire up Open (sniff IFF, load directly)

**Files:**
- Modify: `src/overmind/app/actions.ts` (add `beginIlbmLoad` + helper)
- Modify: `src/components/menubar/MenuItemOpen.tsx` (optional `accept` prop)
- Modify: `src/components/menubar/Menubar.tsx` (`handleImageFileOpen` sniffs IFF)

**Interfaces:**
- Consumes: `decodeIlbm`, `IlbmError`, `IlbmImage`, `IlbmCycleRange` (Task 4); existing `CanvasColorIndex.fromIndexedPixels`, `setPendingCanvasContent`, `actions.palette.replacePalette`, `actions.canvas.setResolution/setTrueColorEnabled`, `paintingCanvasController.updatePalette`, `overlayCanvasController.updatePalette`; `PaletteRange` from `src/overmind/palette/state.ts`.
- Produces: `actions.app.beginIlbmLoad(file: File)`.

UI wiring is deliberately untested (project convention, see CLAUDE.md) — verification is manual, using a generated sample file.

- [ ] **Step 1: Add `beginIlbmLoad` to `src/overmind/app/actions.ts`**

Add imports at the top (alongside the existing ones):

```ts
import { decodeIlbm, IlbmCycleRange, IlbmError } from '../../fileformat/ilbm';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { PaletteRange } from '../palette/state';
```

Add after `beginImageLoad`:

```ts
// Opens an IFF ILBM file. Unlike beginImageLoad there is no color-treatment
// requester: an ILBM is already indexed and carries its own palette (and
// DPaint never asked either). Commits through the same pipeline as the
// requester's OK: palette first, then the pixels via the resolution effect.
export const beginIlbmLoad = async (context: Context, file: File): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = decodeIlbm(bytes);

    context.actions.canvas.setTrueColorEnabled(false);
    context.actions.palette.replacePalette(image.palette);
    // after replacePalette — it clamps/keeps the previous document's ranges
    context.state.palette.ranges = toPaletteRanges(image.cycleRanges);
    // the GL palette textures don't watch Overmind — push the new palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();

    const colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, image.pixels);
    // the canvas resizes to the image; the resolution effect uploads the
    // queued content once the resize commits and resets undo history to it
    setPendingCanvasContent(colorIndex, { freshDocument: true });
    context.actions.canvas.setResolution({
      width: image.width,
      height: image.height,
      recordUndoPoint: false,
    });
  } catch (error) {
    alert(
      error instanceof IlbmError ? `Failed to open IFF file: ${error.message}` : 'Failed to open file!'
    );
  } finally {
    context.actions.app.setLoading(false);
  }
};

// DPaint's CRNG ranges map onto the palette's fixed four Range slots (color
// ids are 1-based where CRNG positions are 0-based). Rate and direction have
// no home yet — they return once color cycling is a feature.
function toPaletteRanges(cycleRanges: IlbmCycleRange[]): (PaletteRange | null)[] {
  const usable = cycleRanges.filter((r) => r.low < r.high).slice(0, 4);
  return [0, 1, 2, 3].map((i) =>
    usable[i] ? { start: String(usable[i].low + 1), end: String(usable[i].high + 1) } : null
  );
}
```

- [ ] **Step 2: Add the `accept` prop to `MenuItemOpen`**

In `src/components/menubar/MenuItemOpen.tsx`, extend the props and use them (the brush-open usage keeps the default):

```ts
interface Props {
  label: string;
  handleFile: (input: HTMLInputElement) => void;
  // both users take images; image open additionally takes IFF ILBM, which
  // no browser exposes under image/* (it can't decode it — we do)
  accept?: string;
}

export function MenuItemOpen({ label, handleFile, accept = 'image/*' }: Props): JSX.Element {
```

and change the input's attribute to `accept={accept}`.

- [ ] **Step 3: Sniff IFF files in `Menubar.tsx`**

In `src/components/menubar/Menubar.tsx`, replace `handleImageFileOpen` with:

```ts
  const handleImageFileOpen = (input: HTMLInputElement): void => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void (async (): Promise<void> => {
      if (await isIffFile(file)) {
        actions.app.beginIlbmLoad(file);
      } else {
        // decodes, then opens the load requester (color treatment)
        actions.app.beginImageLoad(URL.createObjectURL(file));
      }
    })();
  };
```

Add the sniffer as a module-level function (near `saveCanvasAsPng`):

```ts
// IFF is recognized by content, not extension — 'FORM' + a form type we can
// decode. Extensions in the wild vary (.iff, .lbm, .ilbm) and lie.
async function isIffFile(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 12) {
    return false;
  }
  const id = (o: number): string =>
    String.fromCharCode(head[o], head[o + 1], head[o + 2], head[o + 3]);
  return id(0) === 'FORM' && (id(8) === 'ILBM' || id(8) === 'PBM ');
}
```

Find the image-open menu item (the `<MenuItemOpen ... handleFile={handleImageFileOpen} />` usage) and add the accept override so IFF files are selectable in the native dialog:

```tsx
accept="image/*,.iff,.ilbm,.lbm"
```

- [ ] **Step 4: Generate a sample .iff for manual testing**

Create `test/fileformat/writeSample.test.ts` — mirrors the repo's `UPDATE_FIXTURES` golden-file convention; it only runs when explicitly asked:

```ts
import { test } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeIlbm } from '../../src/fileformat/ilbm';

// Not a test — a generator for a manual-testing sample. Run with:
//   WRITE_SAMPLE=1 npm test
// Writes test/fileformat/__fixtures__/sample.iff: 64x32, 8-color bars.
test.runIf(process.env.WRITE_SAMPLE === '1')('writes sample.iff', () => {
  const width = 64;
  const height = 32;
  const palette = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 160, b: 0 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 200, b: 0 },
    { r: 0, g: 100, b: 255 },
    { r: 160, g: 0, b: 255 },
  ];
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = Math.floor(x / 8);
    }
  }
  const cycleRanges = [{ low: 2, high: 7, rate: 8192, active: true, reverse: false }];
  mkdirSync('test/fileformat/__fixtures__', { recursive: true });
  writeFileSync(
    'test/fileformat/__fixtures__/sample.iff',
    encodeIlbm({ width, height, palette, pixels, cycleRanges })
  );
});
```

Run: `WRITE_SAMPLE=1 npm test`
Expected: PASS, and `test/fileformat/__fixtures__/sample.iff` exists.

- [ ] **Step 5: Manual verification**

Run: `npm start`, open http://localhost:3000, then Image > Open… and pick `test/fileformat/__fixtures__/sample.iff`.

Expected: the canvas resizes to 64×32 showing 8 color bars; the palette shows those 8 colors (foreground/background ids clamped into range); undo history starts fresh; Range 1 in the palette editor spans colors 3–8. Also verify a PNG still opens through the requester as before.

Bonus check with a real Amiga file: any ILBM from a period archive (e.g. amiga.lychesis.net) should open; a HAM image should show the "HAM … not supported" alert, not a broken canvas.

- [ ] **Step 6: Lint, build, full test run, commit**

```bash
npm run lint && npm run build && npm test
git add src/overmind/app/actions.ts src/components/menubar/MenuItemOpen.tsx src/components/menubar/Menubar.tsx test/fileformat/writeSample.test.ts test/fileformat/__fixtures__/sample.iff
git commit -m "Open IFF ILBM images (content-sniffed, direct indexed load)"
```

---

### Task 8: Wire up Save

**Files:**
- Modify: `src/components/menubar/Menubar.tsx` (generalize `saveCanvasAsPng` → `saveFile`; add `handleImageSaveIlbm`; add the menu item)

**Interfaces:**
- Consumes: `encodeIlbm` (Task 5), `toIndexedPixels` (Task 6), `paintingCanvasController.getCanvasColorIndex()`, `state.palette.paletteArray`, `state.palette.ranges`.

- [ ] **Step 1: Generalize the save helper**

In `Menubar.tsx`, replace `saveCanvasAsPng` with a blob-generic `saveFile` plus a thin PNG adapter (the picker-before-async-work ordering is preserved — transient activation must be spent while fresh):

```ts
interface SaveFileType {
  description: string;
  mime: string;
  extension: string;
}

// Saves a blob to a file. Asks for the save location first, while the user
// gesture is still fresh (transient activation can expire across async work).
// showSaveFilePicker is Chromium only — other browsers fall back to a regular
// download.
async function saveFile(
  makeBlob: () => Promise<Blob | null>,
  suggestedName: string,
  fileType: SaveFileType
): Promise<void> {
  type SaveFilePicker = (options?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<WritableStream> }>;
  const showSaveFilePicker = (window as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;

  let fileHandle = null;
  if (showSaveFilePicker) {
    try {
      fileHandle = await showSaveFilePicker({
        suggestedName,
        types: [
          { description: fileType.description, accept: { [fileType.mime]: [fileType.extension] } },
        ],
      });
    } catch {
      return; // user cancelled the picker
    }
  }

  const blob = await makeBlob();
  if (!blob) {
    return;
  }

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    const writer = writable.getWriter();
    await writer.write(blob);
    await writer.close();
    return;
  }

  // fallback: regular browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout((): void => URL.revokeObjectURL(url), 1000);
}

async function saveCanvasAsPng(canvas: HTMLCanvasElement, suggestedName: string): Promise<void> {
  await saveFile(
    () => new Promise((resolve): void => canvas.toBlob(resolve, 'image/png')),
    suggestedName,
    { description: 'PNG image', mime: 'image/png', extension: '.png' }
  );
}
```

(The two existing PNG call sites — `handleImageSave`, `handleBrushSave` — need no changes.)

- [ ] **Step 2: Add the ILBM save handler**

Add imports to `Menubar.tsx`:

```ts
import { encodeIlbm } from '../../fileformat/ilbm';
```

Add inside the `Menubar` component, after `handleImageSave`:

```ts
  const handleImageSaveIlbm = (): void => {
    const colorIndex = paintingCanvasController.getCanvasColorIndex();
    const pixels = colorIndex?.toIndexedPixels();
    if (!colorIndex || !pixels) {
      alert(
        'The image has True Color pixels — IFF ILBM stores palette-indexed pixels only. ' +
          'Turn True Color off in Screen Format first.'
      );
      return;
    }
    // plain copies: proxied state objects don't belong in a tight encode loop
    const palette = state.palette.palette;
    const colors = Object.values(palette).map((c) => ({ r: c.r, g: c.g, b: c.b }));
    const cycleRanges = state.palette.ranges.flatMap((range) =>
      range
        ? [
            {
              low: Number(range.start) - 1,
              high: Number(range.end) - 1,
              rate: 8192, // 30 steps/s, a mild DPaint-ish default until cycling is real
              active: true,
              reverse: false,
            },
          ]
        : []
    );
    const bytes = encodeIlbm({
      width: colorIndex.width,
      height: colorIndex.height,
      palette: colors,
      pixels,
      cycleRanges,
    });
    void saveFile(async () => new Blob([bytes], { type: 'image/x-ilbm' }), 'redpaint.iff', {
      description: 'IFF ILBM image',
      mime: 'image/x-ilbm',
      extension: '.iff',
    });
  };
```

- [ ] **Step 3: Add the menu item**

In the menu JSX, directly below the existing image `<MenuItemSave label="Save..." onSave={handleImageSave} />` entry (grep for `handleImageSave`), add:

```tsx
<MenuItemSave label="Save ILBM..." onSave={handleImageSaveIlbm} />
```

- [ ] **Step 4: Manual verification (full round-trip)**

Run: `npm start`, then:

1. Open `test/fileformat/__fixtures__/sample.iff`, draw a few strokes, Save ILBM… as `roundtrip.iff`.
2. Open `roundtrip.iff` again — strokes, palette and Range 1 all survive.
3. Load a PNG photo as True Color, try Save ILBM… — the True Color alert appears, nothing saved.
4. Best-of-all check: open `roundtrip.iff` in a real viewer (XnView, or DPaint in an emulator) and confirm it displays.

- [ ] **Step 5: Lint, build, full test run, commit**

```bash
npm run lint && npm run build && npm test
git add src/components/menubar/Menubar.tsx
git commit -m "Save the canvas as IFF ILBM"
```

---

## Future work (explicitly out of v1 scope)

- **HAM6/HAM8 decode** → true-color pixels through the existing `IMAGE_LOAD` requester (the hybrid pipeline already supports it; the decoder needs the hold-and-modify unrolling).
- **24-bit deep ILBM** decode (same true-color path) and write (for hybrid canvases, instead of the alert).
- **Color cycling playback** — `CRNG` rate/direction currently drop to the fixed four `PaletteRange` slots; keep `IlbmCycleRange` as the richer model when cycling becomes a feature.
- **Drag-and-drop** an `.iff` onto the canvas — reuse `isIffFile` + `beginIlbmLoad`.
- **ANIM** (DPaint animations) — a much bigger project on top of the same IFF layer.
