// GIF89a encode. Still images for now; the block layout below is the one an
// animation adds frames to, which is why the pieces are separate writers.
//
// GIF is the one export format that cannot be anything but indexed (there is no
// truecolor GIF), so unlike PNG, where the browser's encoder flattens the
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
  // The one index the decoder should leave alone, if any. GIF has no alpha.
  // Transparency is this single index, and it costs a Graphic Control Extension
  // to say so.
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
// sized by the highest index actually used as well as by the palette's length:
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

// Collects bytes without knowing the total up front. The LZW stream's length is
// not predictable, and neither is the file's.
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
        // decoder rather than reasoned about: the round-trip against our own
        // reader passed happily with this wrong.
        if (nextCode >= 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
        table.set(key, nextCode);
        nextCode++;
      } else {
        // Full at 12 bits, the format's ceiling: start over. The Clear goes out
        // at the current width, before the reset. The decoder is still reading
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
    // Entries past the palette are padding. A table has to be a power of two
    // whatever the picture uses. Black, as ILBM's CMAP padding is.
    out.byte(color ? color.r : 0);
    out.byte(color ? color.g : 0);
    out.byte(color ? color.b : 0);
  }
}

// What a load gets back: the first frame, flattened onto the logical screen.
export interface DecodedGif {
  width: number;
  height: number;
  palette: Color[];
  pixels: Uint8Array;
  transparentIndex?: number;
  // How many frames the file actually held. Decoding stops after the first
  // (this is a paint program, not a player), but the caller may want to say so.
  frameCount: number;
}

// Content-sniffs a GIF from its first six bytes, the same job isIlbmHeader
// does for IFF: an extension is a guess and a GIF may not have one at all
// (a drag from a web page often doesn't).
export function isGifHeader(head: Uint8Array): boolean {
  if (head.length < 6) {
    return false;
  }
  const signature = String.fromCharCode(...head.subarray(0, 6));
  return signature === 'GIF89a' || signature === 'GIF87a';
}

// Rows of an interlaced GIF arrive in four passes rather than top to bottom.
// Nothing this app writes is interlaced, but plenty of GIFs in the wild are,
// and reading one as progressive gives a picture that is shuffled rather than
// obviously broken: the worst kind of wrong.
const INTERLACE_PASSES = [
  { start: 0, step: 8 },
  { start: 4, step: 8 },
  { start: 2, step: 4 },
  { start: 1, step: 2 },
];

class GifReader {
  private at = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get offset(): number {
    return this.at;
  }

  get exhausted(): boolean {
    return this.at >= this.bytes.length;
  }

  byte(): number {
    if (this.at >= this.bytes.length) {
      throw new GifError('GIF ends in the middle of a block');
    }
    return this.bytes[this.at++];
  }

  uint16(): number {
    return this.byte() | (this.byte() << 8);
  }

  colorTable(size: number): Color[] {
    const table: Color[] = [];
    for (let i = 0; i < size; i++) {
      table.push({ r: this.byte(), g: this.byte(), b: this.byte() });
    }
    return table;
  }

  // A run of length-prefixed blocks, closed by a zero length. Both extensions
  // and image data use them, so skipping an extension is just reading and
  // discarding.
  //
  // Runs out rather than throwing when the file is short. A truncated GIF is a
  // damaged file, but the part that did arrive is still a picture, and every
  // browser shows it. Refusing the whole thing would be this app being stricter
  // than the format's own audience for no gain. The LZW below stops the same
  // way, so a partial image comes back partial rather than jagged.
  subBlocks(): Uint8Array {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (!this.exhausted) {
      const size = this.byte();
      if (size === 0) {
        break;
      }
      const end = Math.min(this.at + size, this.bytes.length);
      parts.push(this.bytes.subarray(this.at, end));
      total += end - this.at;
      this.at = end;
    }
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      joined.set(part, offset);
      offset += part.length;
    }
    return joined;
  }
}

// The mirror of lzwCompress. The table is held as prefix/suffix pairs rather
// than as arrays of bytes: an entry can be thousands of pixels long by the end
// of a large image, and copying those around per code is what makes a naive
// decoder slow enough to notice on a full-canvas load.
function lzwDecompress(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array {
  if (minCodeSize < 2 || minCodeSize > 8) {
    throw new GifError(`Bad LZW minimum code size ${minCodeSize}`);
  }
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const prefixes = new Int32Array(4096);
  const suffixes = new Uint8Array(4096);
  const firsts = new Uint8Array(4096);
  for (let i = 0; i < clearCode; i++) {
    prefixes[i] = -1;
    suffixes[i] = i;
    firsts[i] = i;
  }

  const out = new Uint8Array(pixelCount);
  let written = 0;
  const stack = new Uint8Array(4096);

  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let previous = -1;

  let bitBuffer = 0;
  let bitCount = 0;
  let at = 0;

  while (written < pixelCount) {
    while (bitCount < codeSize) {
      if (at >= data.length) {
        // Truncated, but what has been decoded so far is still a picture:
        // better to show it than to refuse the file outright.
        return out;
      }
      bitBuffer |= data[at++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;

    if (code === endCode) {
      break;
    }
    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
      previous = -1;
      continue;
    }

    let current = code;
    let depth = 0;
    if (code >= nextCode) {
      if (previous < 0) {
        throw new GifError('GIF image data starts with an undefined code');
      }
      // The one self-referential case: a code defined by the very sequence it
      // is about to stand for, so its last symbol is its own first.
      stack[depth++] = firsts[previous];
      current = previous;
    }
    while (current >= clearCode) {
      stack[depth++] = suffixes[current];
      current = prefixes[current];
    }
    stack[depth++] = current & 0xff;

    for (let i = depth - 1; i >= 0 && written < pixelCount; i--) {
      out[written++] = stack[i];
    }

    if (previous >= 0 && nextCode < 4096) {
      prefixes[nextCode] = previous;
      suffixes[nextCode] = current & 0xff;
      firsts[nextCode] = firsts[previous];
      nextCode++;
      if (nextCode >= 1 << codeSize && codeSize < 12) {
        codeSize++;
      }
    }
    // Always the code just read, including the self-referential case: the
    // entry it stood for has been defined by now, so it is no longer forward.
    previous = code;
  }

  return out;
}

// Reads a GIF's first frame. Always indexed (there is no other kind), so unlike
// a PNG this hands back the file's own palette and indices rather than RGBA for
// the palette to be guessed back out of.
export function decodeGif(bytes: Uint8Array): DecodedGif {
  if (!isGifHeader(bytes)) {
    throw new GifError('Not a GIF file');
  }
  const reader = new GifReader(bytes);
  for (let i = 0; i < 6; i++) {
    reader.byte(); // signature, already checked
  }

  const screenWidth = reader.uint16();
  const screenHeight = reader.uint16();
  const packed = reader.byte();
  const backgroundIndex = reader.byte();
  reader.byte(); // pixel aspect ratio

  let palette: Color[] = packed & 0x80 ? reader.colorTable(1 << ((packed & 0x07) + 1)) : [];

  if (screenWidth === 0 || screenHeight === 0) {
    throw new GifError(`GIF has an empty logical screen (${screenWidth}x${screenHeight})`);
  }

  let transparentIndex: number | undefined;
  let pendingTransparent: number | undefined;
  let pixels: Uint8Array | undefined;
  let frameCount = 0;

  while (!reader.exhausted) {
    const block = reader.byte();
    if (block === 0x3b) {
      break; // trailer
    }
    if (block === 0x21) {
      const label = reader.byte();
      if (label === 0xf9) {
        const size = reader.byte();
        const flags = reader.byte();
        reader.uint16(); // delay — a still load has no use for it
        const index = reader.byte();
        pendingTransparent = flags & 0x01 ? index : undefined;
        // Skip anything a future spec put after the four bytes we know.
        for (let i = 4; i < size; i++) {
          reader.byte();
        }
        reader.byte(); // block terminator
      } else {
        reader.subBlocks(); // comment, application (incl. the loop block), text
      }
      continue;
    }
    if (block !== 0x2c) {
      throw new GifError(`Unknown GIF block 0x${block.toString(16)}`);
    }

    frameCount++;
    const left = reader.uint16();
    const top = reader.uint16();
    const frameWidth = reader.uint16();
    const frameHeight = reader.uint16();
    const framePacked = reader.byte();
    const localTable =
      framePacked & 0x80 ? reader.colorTable(1 << ((framePacked & 0x07) + 1)) : null;
    const interlaced = (framePacked & 0x40) !== 0;

    const minCodeSize = reader.byte();
    const data = reader.subBlocks();

    if (pixels) {
      continue; // a later frame: counted, not decoded
    }
    if (frameWidth === 0 || frameHeight === 0) {
      throw new GifError(`GIF frame is empty (${frameWidth}x${frameHeight})`);
    }
    if (localTable) {
      palette = localTable;
    }
    transparentIndex = pendingTransparent;

    const frame = lzwDecompress(data, minCodeSize, frameWidth * frameHeight);

    // A frame need not cover the logical screen. What it leaves uncovered is
    // the background index, which is what a decoder showing this file would put
    // there, so the picture that loads is the picture you were looking at.
    pixels = new Uint8Array(screenWidth * screenHeight).fill(backgroundIndex);
    let source = 0;
    for (const pass of interlaced ? INTERLACE_PASSES : [{ start: 0, step: 1 }]) {
      for (let y = pass.start; y < frameHeight; y += pass.step) {
        const target = (top + y) * screenWidth + left;
        for (let x = 0; x < frameWidth; x++, source++) {
          if (top + y < screenHeight && left + x < screenWidth) {
            pixels[target + x] = frame[source];
          }
        }
      }
    }
  }

  if (!pixels) {
    throw new GifError('GIF contains no image');
  }
  return {
    width: screenWidth,
    height: screenHeight,
    palette,
    pixels,
    transparentIndex,
    frameCount,
  };
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
  // block is optional. An animation is where it stops being.
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

  // Image Descriptor. No local color table. One image, so the global one is its
  // table; per-frame local tables are what a cycling animation will want.
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
