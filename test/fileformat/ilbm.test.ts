import { describe, expect, test } from 'vitest';
import { decodeIlbm, encodeIlbm, IlbmError, isIlbmHeader } from '../../src/fileformat/ilbm';
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

describe('isIlbmHeader', () => {
  function ascii(s: string): number[] {
    return [...s].map((c) => c.charCodeAt(0));
  }

  test('accepts an ILBM header', () => {
    expect(isIlbmHeader(new Uint8Array([...ascii('FORM'), 0, 0, 0, 0, ...ascii('ILBM')]))).toBe(
      true
    );
  });

  test('accepts a PBM header', () => {
    expect(isIlbmHeader(new Uint8Array([...ascii('FORM'), 0, 0, 0, 0, ...ascii('PBM ')]))).toBe(
      true
    );
  });

  test('rejects a non-FORM header (e.g. a PNG signature)', () => {
    expect(isIlbmHeader(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      false
    );
  });

  test('rejects an unrelated FORM type', () => {
    expect(isIlbmHeader(new Uint8Array([...ascii('FORM'), 0, 0, 0, 0, ...ascii('8SVX')]))).toBe(
      false
    );
  });

  test('rejects a short/partial read', () => {
    expect(isIlbmHeader(new Uint8Array([...ascii('FORM')]))).toBe(false);
  });
});

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

describe('encodeIlbm', () => {
  test('round-trips pixels, palette and cycle ranges through decodeIlbm', () => {
    const width = 37; // odd width exercises row padding
    const height = 23;
    const palette = Array.from({ length: 32 }, (_, i) => ({
      r: (i * 8 + 1) & 0xff, // low nibbles nonzero so the 4-bit heuristic stays off
      g: (255 - i * 7) | 1,
      b: ((i * 13) & 0xff) | 1,
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
