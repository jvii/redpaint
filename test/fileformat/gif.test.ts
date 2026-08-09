import { describe, expect, test } from 'vitest';
import { encodeGif, GifError } from '../../src/fileformat/gif';
import { decodeGif } from '../gif';
import { Color } from '../../src/types';

// Round-tripped through test/gif.ts, a decoder written from the spec rather
// than from the encoder — so a shared misreading cannot pass.

function greys(count: number): Color[] {
  return Array.from({ length: count }, (_, i) => ({ r: i, g: i, b: i }));
}

function roundTrip(image: Parameters<typeof encodeGif>[0]): ReturnType<typeof decodeGif> {
  return decodeGif(encodeGif(image));
}

// The one test that does not go through our own reader, and the reason it
// exists: an earlier encoder widened its LZW code one step too early, and every
// round-trip above still passed, because the reader had been written to the
// same misreading. Chrome rejected it instantly.
//
// So these bytes are pinned. They are a 4x2 image with a five-color palette
// (padded to eight), decoded pixel-exact by Chrome's own GIF decoder before
// being written down here. Anything that changes them changes the file real
// decoders see — which may be fine, but it has to be a decision, and re-checked
// against something outside this repo rather than against our reader.
const VERIFIED_4X2 =
  '47494638396104000200f20000ff000000ff000000ffffffff00000000000000' +
  '00000000002c0000000004000200000306082143232101003b';

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('encodeGif', () => {
  test('writes the bytes a real decoder was checked against', () => {
    const bytes = encodeGif({
      width: 4,
      height: 2,
      palette: [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 255, b: 255 },
        { r: 0, g: 0, b: 0 },
      ],
      pixels: Uint8Array.of(0, 1, 2, 3, 4, 3, 2, 1),
    });
    expect(toHex(bytes)).toBe(VERIFIED_4X2);
  });

  test('writes a GIF89a header', () => {
    const bytes = encodeGif({ width: 1, height: 1, palette: greys(2), pixels: Uint8Array.of(0) });
    expect(String.fromCharCode(...bytes.subarray(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b); // trailer
  });

  test('round-trips a single pixel', () => {
    const decoded = roundTrip({
      width: 1,
      height: 1,
      palette: greys(4),
      pixels: Uint8Array.of(3),
    });
    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(1);
    expect([...decoded.pixels]).toEqual([3]);
  });

  test('round-trips pixels and palette', () => {
    const palette: Color[] = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ];
    const pixels = Uint8Array.of(0, 1, 2, 3, 3, 2, 1, 0, 1, 1, 2, 2);
    const decoded = roundTrip({ width: 4, height: 3, palette, pixels });
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(3);
    expect([...decoded.pixels]).toEqual([...pixels]);
    expect(decoded.palette.slice(0, 4)).toEqual(palette);
  });

  // The color table must be a power of two, so a 5-color palette ships 8
  // entries and the padding has to be inert rather than shifting the indices.
  test('pads the color table to a power of two without moving indices', () => {
    const palette = greys(5);
    const decoded = roundTrip({
      width: 5,
      height: 1,
      palette,
      pixels: Uint8Array.of(0, 1, 2, 3, 4),
    });
    expect(decoded.palette).toHaveLength(8);
    expect(decoded.palette.slice(0, 5)).toEqual(palette);
    expect(decoded.palette.slice(5)).toEqual([
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
    ]);
    expect([...decoded.pixels]).toEqual([0, 1, 2, 3, 4]);
  });

  // redpaint keeps a dropped slot's index, so a pixel can point past the end of
  // the palette array. The table has to cover it or the index means nothing.
  test('sizes the table by the highest index used, not just the palette', () => {
    const decoded = roundTrip({
      width: 2,
      height: 1,
      palette: greys(2),
      pixels: Uint8Array.of(0, 200),
    });
    expect(decoded.palette).toHaveLength(256);
    expect([...decoded.pixels]).toEqual([0, 200]);
  });

  test('a two-color image still uses the minimum code size of 2', () => {
    const bytes = encodeGif({
      width: 2,
      height: 1,
      palette: greys(2),
      pixels: Uint8Array.of(0, 1),
    });
    // 6 header + 7 screen descriptor + 2*3 table + 10 image descriptor
    expect(bytes[6 + 7 + 6 + 10]).toBe(2);
    expect([...decodeGif(bytes).pixels]).toEqual([0, 1]);
  });

  describe('transparency', () => {
    test('is absent unless asked for', () => {
      const decoded = roundTrip({
        width: 1,
        height: 1,
        palette: greys(2),
        pixels: Uint8Array.of(0),
      });
      expect(decoded.transparentIndex).toBeUndefined();
    });

    test('round-trips the index when given', () => {
      const decoded = roundTrip({
        width: 2,
        height: 1,
        palette: greys(4),
        pixels: Uint8Array.of(0, 1),
        transparentIndex: 2,
      });
      expect(decoded.transparentIndex).toBe(2);
      expect([...decoded.pixels]).toEqual([0, 1]);
    });

    test('rejects an index outside the table', () => {
      expect(() =>
        encodeGif({
          width: 1,
          height: 1,
          palette: greys(2),
          pixels: Uint8Array.of(0),
          transparentIndex: 9,
        })
      ).toThrow(GifError);
    });
  });

  describe('the LZW stream', () => {
    // Long runs are what the code width growing is for; getting the widen point
    // wrong here desynchronises the decoder rather than failing loudly.
    test('round-trips a long single-color run', () => {
      const pixels = new Uint8Array(4096).fill(7);
      const decoded = roundTrip({ width: 64, height: 64, palette: greys(8), pixels });
      expect([...decoded.pixels]).toEqual([...pixels]);
    });

    test('compresses that run to a fraction of its size', () => {
      const pixels = new Uint8Array(4096).fill(7);
      const decoded = roundTrip({ width: 64, height: 64, palette: greys(8), pixels });
      expect(decoded.lzwByteLength).toBeLessThan(pixels.length / 10);
    });

    // Enough incompressible data to fill the 4096-code table and force the
    // encoder to emit a Clear and start over mid-stream — the one path where
    // encoder and decoder have to agree about resetting, not just widening.
    test('round-trips through a mid-stream table reset', () => {
      let seed = 12345;
      const pixels = new Uint8Array(80000);
      for (let i = 0; i < pixels.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        pixels[i] = (seed >> 16) & 0xff;
      }
      const decoded = roundTrip({ width: 400, height: 200, palette: greys(256), pixels });
      expect([...decoded.pixels]).toEqual([...pixels]);
    });

    // A sub-block carries at most 255 bytes, so anything bigger is split and
    // the lengths have to be right or the stream runs off its own end.
    test('round-trips across sub-block boundaries', () => {
      const pixels = new Uint8Array(3000);
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = (i * 7) % 251; // long period: resists compression
      }
      const decoded = roundTrip({ width: 100, height: 30, palette: greys(256), pixels });
      expect([...decoded.pixels]).toEqual([...pixels]);
    });
  });

  describe('rejects what it cannot write', () => {
    test('a palette larger than the format allows', () => {
      expect(() =>
        encodeGif({ width: 1, height: 1, palette: greys(256), pixels: Uint8Array.of(0) })
      ).not.toThrow();
      expect(() =>
        encodeGif({ width: 1, height: 1, palette: greys(257), pixels: Uint8Array.of(0) })
      ).toThrow(GifError);
    });

    test('a pixel count that does not match the dimensions', () => {
      expect(() =>
        encodeGif({ width: 4, height: 4, palette: greys(2), pixels: Uint8Array.of(0, 1) })
      ).toThrow(GifError);
    });

    test('an empty image', () => {
      expect(() =>
        encodeGif({ width: 0, height: 0, palette: greys(2), pixels: new Uint8Array(0) })
      ).toThrow(GifError);
    });
  });
});
