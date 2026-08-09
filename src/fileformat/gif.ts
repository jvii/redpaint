// GIF89a encode. Still images for now; the block layout below is the one an
// animation adds frames to, which is why the pieces are separate writers.
//
// GIF is the one export format that cannot be anything but indexed — there is
// no truecolor GIF — so unlike PNG, where the browser's encoder flattens the
// picture to RGBA on the way out, this writes redpaint's own indices through
// unchanged. `CanvasColorIndex.toIndexedPixels()` is already exactly the array
// this wants.
//
// Written by hand for the same reason ILBM is: `canvas.toBlob` will not produce
// a GIF at any quality setting, and asking it for a type it cannot encode
// silently hands back PNG bytes rather than failing.

import { Color } from '../types';

export interface GifImage {
  width: number;
  height: number;
  palette: Color[]; // up to 256; padded out to a power of two on the way out
  pixels: Uint8Array; // width*height palette indices, rows top-down
  // The one index the decoder should leave alone, if any. GIF has no alpha —
  // transparency is this single index, and it costs a Graphic Control
  // Extension to say so.
  transparentIndex?: number;
}

export class GifError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GifError';
  }
}

// A GIF color table has to be a power of two, at least 2 and at most 256
// entries. Dropped palette slots keep their index in redpaint, so the table is
// sized by the highest index actually used as well as by the palette's length —
// the same reasoning as encodeIlbm's register count.
function colorTableSize(palette: Color[], pixels: Uint8Array): number {
  let maxIndex = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > maxIndex) {
      maxIndex = pixels[i];
    }
  }
  const needed = Math.max(2, palette.length, maxIndex + 1);
  if (needed > 256) {
    throw new GifError(`GIF holds at most 256 colors, needed ${needed}`);
  }
  return 1 << Math.ceil(Math.log2(needed));
}

// Collects bytes without knowing the total up front — the LZW stream's length
// is not predictable, and neither is the file's.
class ByteWriter {
  private bytes: number[] = [];

  byte(value: number): void {
    this.bytes.push(value & 0xff);
  }

  // Every multi-byte field in GIF is little-endian, unlike IFF's big-endian.
  uint16(value: number): void {
    this.bytes.push(value & 0xff, (value >> 8) & 0xff);
  }

  raw(values: ArrayLike<number>): void {
    for (let i = 0; i < values.length; i++) {
      this.bytes.push(values[i] & 0xff);
    }
  }

  ascii(text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.bytes.push(text.charCodeAt(i) & 0xff);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// GIF's variable-width LZW, which differs from the textbook version in three
// ways worth stating because each one is a silent corruption if missed: codes
// are packed **least-significant bit first**, the code width grows as the table
// fills (and the decoder grows its own in step, so the two must agree exactly
// on when), and the output is cut into sub-blocks of at most 255 bytes.
//
// Two codes are reserved above the roots: Clear resets the table mid-stream,
// End terminates. The table starts one past them.
function lzwCompress(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const out = new ByteWriter();
  let bitBuffer = 0;
  let bitCount = 0;
  let codeSize = minCodeSize + 1;

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.byte(bitBuffer);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  // Keyed on prefix code and next index packed into one number rather than a
  // string: this runs once per pixel, and a whole-canvas save is millions of
  // them. A prefix is < 4096 and an index < 256, so the pair fits in 20 bits.
  let table = new Map<number, number>();
  let nextCode = endCode + 1;

  emit(clearCode);

  if (pixels.length > 0) {
    let prefix = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
      const next = pixels[i];
      const key = (prefix << 8) | next;
      const found = table.get(key);
      if (found !== undefined) {
        prefix = found;
        continue;
      }
      emit(prefix);
      if (nextCode < 4096) {
        // Widen *before* taking the code, not after. The decoder cannot define
        // an entry until it has seen the code after the one that created it, so
        // it is permanently one behind; checking after the increment widens an
        // emit too early and the two desynchronise. Verified against a real
        // decoder rather than reasoned about — the round-trip against our own
        // reader passed happily with this wrong.
        if (nextCode >= 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
        table.set(key, nextCode);
        nextCode++;
      } else {
        // Full at 12 bits, the format's ceiling: start over. The Clear goes out
        // at the current width, before the reset — the decoder is still reading
        // 12-bit codes when it arrives.
        emit(clearCode);
        table = new Map<number, number>();
        nextCode = endCode + 1;
        codeSize = minCodeSize + 1;
      }
      prefix = next;
    }
    emit(prefix);
  }

  emit(endCode);
  if (bitCount > 0) {
    out.byte(bitBuffer);
  }
  return out.toUint8Array();
}

// The LZW stream is carried in sub-blocks: a length byte, up to 255 bytes, and
// so on, closed by a zero-length block.
function writeSubBlocks(out: ByteWriter, data: Uint8Array): void {
  for (let offset = 0; offset < data.length; offset += 255) {
    const chunk = data.subarray(offset, offset + 255);
    out.byte(chunk.length);
    out.raw(chunk);
  }
  out.byte(0);
}

function writeColorTable(out: ByteWriter, palette: Color[], size: number): void {
  for (let i = 0; i < size; i++) {
    const color = palette[i];
    // Entries past the palette are padding — a table has to be a power of two
    // whatever the picture uses. Black, as ILBM's CMAP padding is.
    out.byte(color ? color.r : 0);
    out.byte(color ? color.g : 0);
    out.byte(color ? color.b : 0);
  }
}

export function encodeGif(image: GifImage): Uint8Array {
  const { width, height, palette, pixels, transparentIndex } = image;

  if (width <= 0 || height <= 0) {
    throw new GifError(`GIF needs a non-empty image, got ${width}x${height}`);
  }
  if (width > 0xffff || height > 0xffff) {
    throw new GifError(`GIF dimensions are 16-bit, got ${width}x${height}`);
  }
  if (pixels.length !== width * height) {
    throw new GifError(`Expected ${width * height} pixels, got ${pixels.length}`);
  }

  const tableSize = colorTableSize(palette, pixels);
  // The roots occupy 0..2^minCodeSize-1. Two is the format's floor even for a
  // two-color table, where one bit would otherwise do.
  const minCodeSize = Math.max(2, Math.log2(tableSize));

  const out = new ByteWriter();
  out.ascii('GIF89a');

  // Logical Screen Descriptor. The image is the whole screen, so these are the
  // image's own dimensions and the background index never comes into play.
  out.uint16(width);
  out.uint16(height);
  out.byte(
    0x80 | // a global color table follows
      (0x7 << 4) | // color resolution: 8 bits per channel in the source
      (Math.log2(tableSize) - 1) // its size, as the exponent less one
  );
  out.byte(0); // background color index
  out.byte(0); // pixel aspect ratio: none given

  writeColorTable(out, palette, tableSize);

  // Graphic Control Extension, only when there is something to say. A still
  // image with no transparent index needs no delay and no disposal, and the
  // block is optional — an animation is where it stops being.
  if (transparentIndex !== undefined) {
    if (transparentIndex < 0 || transparentIndex >= tableSize) {
      throw new GifError(
        `Transparent index ${transparentIndex} is outside the ${tableSize}-color table`
      );
    }
    out.byte(0x21); // extension introducer
    out.byte(0xf9); // graphic control label
    out.byte(4); // block size
    out.byte(0x01); // no disposal, no user input, transparency on
    out.uint16(0); // delay: none, this is a still
    out.byte(transparentIndex);
    out.byte(0); // block terminator
  }

  // Image Descriptor. No local color table — one image, so the global one is
  // its table; per-frame local tables are what a cycling animation will want.
  out.byte(0x2c);
  out.uint16(0); // left
  out.uint16(0); // top
  out.uint16(width);
  out.uint16(height);
  out.byte(0); // no local table, not interlaced, not sorted

  out.byte(minCodeSize);
  writeSubBlocks(out, lzwCompress(pixels, minCodeSize));

  out.byte(0x3b); // trailer
  return out.toUint8Array();
}
