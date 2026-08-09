import { describe, expect, test } from 'vitest';
import { decodeGif, encodeGif, GifError, isGifHeader } from '../../src/fileformat/gif';
import { decodeGif as readGifIndependently } from '../gif';
import { Color } from '../../src/types';

// The encoder is round-tripped through test/gif.ts, a reader written from the
// spec rather than from the encoder — so a shared misreading cannot pass. That
// is why it still exists now that src has a decoder of its own: checking the
// encoder with the decoder that ships beside it is what let the LZW bug below
// through in the first place, and the two are wrong together or not at all.
//
// The decoder gets the opposite treatment: its tests run against encodeGif,
// because that side is pinned to bytes a real decoder verified.

function greys(count: number): Color[] {
  return Array.from({ length: count }, (_, i) => ({ r: i, g: i, b: i }));
}

function roundTrip(
  image: Parameters<typeof encodeGif>[0]
): ReturnType<typeof readGifIndependently> {
  return readGifIndependently(encodeGif(image));
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
    expect([...readGifIndependently(bytes).pixels]).toEqual([0, 1]);
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

describe('decodeGif', () => {
  test('reads back what encodeGif wrote', () => {
    const palette: Color[] = [
      { r: 10, g: 20, b: 30 },
      { r: 200, g: 100, b: 0 },
      { r: 1, g: 2, b: 3 },
      { r: 250, g: 250, b: 250 },
    ];
    const pixels = Uint8Array.of(0, 1, 2, 3, 3, 2, 1, 0, 2, 2, 0, 1);
    const decoded = decodeGif(encodeGif({ width: 4, height: 3, palette, pixels }));
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(3);
    expect([...decoded.pixels]).toEqual([...pixels]);
    expect(decoded.palette.slice(0, 4)).toEqual(palette);
    expect(decoded.frameCount).toBe(1);
  });

  test('survives the whole 4096-code table filling and resetting', () => {
    let seed = 999;
    const pixels = new Uint8Array(90000);
    for (let i = 0; i < pixels.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      pixels[i] = (seed >> 16) & 0xff;
    }
    const palette = greys(256);
    const decoded = decodeGif(encodeGif({ width: 300, height: 300, palette, pixels }));
    expect([...decoded.pixels]).toEqual([...pixels]);
  });

  test('keeps the palette a picture does not use every slot of', () => {
    // The reason to decode a GIF ourselves rather than through drawImage:
    // slot order and unused slots survive, where rediscovering colors from
    // RGBA would collapse the palette to only what is on screen.
    const palette = greys(16);
    const decoded = decodeGif(
      encodeGif({ width: 2, height: 1, palette, pixels: Uint8Array.of(9, 9) })
    );
    expect(decoded.palette).toHaveLength(16);
    expect(decoded.palette[3]).toEqual({ r: 3, g: 3, b: 3 });
    expect([...decoded.pixels]).toEqual([9, 9]);
  });

  test('reads the transparent index', () => {
    const decoded = decodeGif(
      encodeGif({
        width: 1,
        height: 1,
        palette: greys(4),
        pixels: Uint8Array.of(1),
        transparentIndex: 3,
      })
    );
    expect(decoded.transparentIndex).toBe(3);
  });

  test('accepts GIF87a as well as GIF89a', () => {
    const bytes = encodeGif({ width: 1, height: 1, palette: greys(2), pixels: Uint8Array.of(1) });
    bytes.set([...'GIF87a'].map((c) => c.charCodeAt(0)), 0);
    expect([...decodeGif(bytes).pixels]).toEqual([1]);
  });

  describe('rejects what is not a GIF', () => {
    test('a PNG', () => {
      expect(() => decodeGif(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toThrow(
        GifError
      );
    });

    test('something too short to tell', () => {
      expect(() => decodeGif(Uint8Array.of(0x47, 0x49))).toThrow(GifError);
    });

    test('a header with no image after it', () => {
      const bytes = encodeGif({ width: 1, height: 1, palette: greys(2), pixels: Uint8Array.of(0) });
      // header + screen descriptor + 2*3 color table, then straight to trailer
      const truncated = new Uint8Array([...bytes.subarray(0, 6 + 7 + 6), 0x3b]);
      expect(() => decodeGif(truncated)).toThrow(GifError);
    });
  });
});

describe('isGifHeader', () => {
  const gif = (s: string): Uint8Array => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

  test('accepts both versions', () => {
    expect(isGifHeader(gif('GIF89a'))).toBe(true);
    expect(isGifHeader(gif('GIF87a'))).toBe(true);
  });

  test('rejects anything else', () => {
    expect(isGifHeader(gif('GIF88a'))).toBe(false);
    expect(isGifHeader(gif('\x89PNG\r\n'))).toBe(false);
    expect(isGifHeader(gif('GIF'))).toBe(false); // too short to say
  });
});

// Everything a GIF in the wild has that encodeGif never writes. Built by
// patching its output at known offsets rather than by hand-assembling a file:
// the layout is fixed, so the offsets are arithmetic, and the LZW stream stays
// one the encoder actually produced.
describe('decodeGif on files we do not write', () => {
  // header 6 + logical screen descriptor 7 + 3 bytes per color table entry
  const descriptorAt = (tableEntries: number): number => 6 + 7 + 3 * tableEntries;

  const patchUint16 = (bytes: Uint8Array, at: number, value: number): void => {
    bytes[at] = value & 0xff;
    bytes[at + 1] = (value >> 8) & 0xff;
  };

  test('unscrambles an interlaced image', () => {
    // Rows 0..7 of a one-column image, stored in GIF's four-pass order. Setting
    // the interlace bit should put them back.
    const passOrder = [0, 4, 2, 6, 1, 3, 5, 7];
    const bytes = encodeGif({
      width: 1,
      height: 8,
      palette: greys(8),
      pixels: Uint8Array.from(passOrder),
    });
    const packedAt = descriptorAt(8) + 9;
    expect(bytes[packedAt]).toBe(0); // encodeGif writes progressive
    bytes[packedAt] = 0x40; // interlaced

    expect([...decodeGif(bytes).pixels]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test('places a frame smaller than the logical screen, on the background', () => {
    const bytes = encodeGif({
      width: 2,
      height: 2,
      palette: greys(4),
      pixels: Uint8Array.of(1, 1, 1, 1),
    });
    // Grow the screen to 4x4 with background index 3, and offset the frame
    patchUint16(bytes, 6, 4);
    patchUint16(bytes, 8, 4);
    bytes[11] = 3; // background color index
    patchUint16(bytes, descriptorAt(4) + 1, 1); // left
    patchUint16(bytes, descriptorAt(4) + 3, 1); // top

    const decoded = decodeGif(bytes);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect([...decoded.pixels]).toEqual([
      3, 3, 3, 3,
      3, 1, 1, 3,
      3, 1, 1, 3,
      3, 3, 3, 3,
    ]);
  });

  test('takes the first frame of an animation, and counts the rest', () => {
    const first = encodeGif({
      width: 2,
      height: 1,
      palette: greys(4),
      pixels: Uint8Array.of(1, 1),
    });
    const second = encodeGif({
      width: 2,
      height: 1,
      palette: greys(4),
      pixels: Uint8Array.of(2, 2),
    });
    // first without its trailer, then second's image block onward, then trailer
    const secondImage = second.subarray(descriptorAt(4), second.length - 1);
    const animation = new Uint8Array([
      ...first.subarray(0, first.length - 1),
      ...secondImage,
      0x3b,
    ]);

    const decoded = decodeGif(animation);
    expect(decoded.frameCount).toBe(2);
    expect([...decoded.pixels]).toEqual([1, 1]); // the first, not the last
  });

  test('skips extension blocks it has no use for', () => {
    const bytes = encodeGif({
      width: 2,
      height: 1,
      palette: greys(4),
      pixels: Uint8Array.of(3, 2),
    });
    const at = descriptorAt(4);
    // A comment extension spliced in ahead of the image
    const comment = [0x21, 0xfe, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00];
    const withComment = new Uint8Array([...bytes.subarray(0, at), ...comment, ...bytes.subarray(at)]);
    expect([...decodeGif(withComment).pixels]).toEqual([3, 2]);
  });

  // A damaged file still shows what arrived, the way a browser does, rather
  // than being refused whole.
  describe('truncated files', () => {
    const solid = (): Uint8Array =>
      encodeGif({ width: 8, height: 8, palette: greys(4), pixels: new Uint8Array(64).fill(2) });

    test('losing only the terminator still gives the whole image', () => {
      const bytes = solid();
      const decoded = decodeGif(bytes.subarray(0, bytes.length - 2));
      expect([...decoded.pixels]).toEqual([...new Uint8Array(64).fill(2)]);
    });

    test('losing half the data gives a partial image, not an error', () => {
      const bytes = solid();
      const decoded = decodeGif(bytes.subarray(0, descriptorAt(4) + 12));
      expect(decoded.width).toBe(8);
      expect(decoded.height).toBe(8);
      expect(decoded.pixels).toHaveLength(64);
    });
  });
});
