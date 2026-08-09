// A GIF reader, for tests only — the app never reads GIFs, it writes them.
//
// Deliberately a separate implementation rather than a mirror of the encoder:
// its job is to disagree when the encoder is wrong, which a decoder derived
// from the same code could not do. Written from the GIF89a spec's block layout
// the way test/png.ts is written from PNG's.

export type DecodedGif = {
  width: number;
  height: number;
  palette: { r: number; g: number; b: number }[];
  pixels: Uint8Array;
  transparentIndex?: number;
  // Bytes the LZW stream occupied, so a test can say something about size
  // without re-deriving where the image data started.
  lzwByteLength: number;
};

export function decodeGif(bytes: Uint8Array): DecodedGif {
  let at = 0;
  const byte = (): number => bytes[at++];
  const uint16 = (): number => {
    const value = bytes[at] | (bytes[at + 1] << 8);
    at += 2;
    return value;
  };

  const signature = String.fromCharCode(...bytes.subarray(0, 6));
  if (signature !== 'GIF89a' && signature !== 'GIF87a') {
    throw new Error(`Not a GIF: ${JSON.stringify(signature)}`);
  }
  at = 6;

  const width = uint16();
  const height = uint16();
  const packed = byte();
  byte(); // background color index
  byte(); // pixel aspect ratio

  const readColorTable = (size: number): { r: number; g: number; b: number }[] => {
    const table = [];
    for (let i = 0; i < size; i++) {
      table.push({ r: byte(), g: byte(), b: byte() });
    }
    return table;
  };

  let palette: { r: number; g: number; b: number }[] = [];
  if (packed & 0x80) {
    palette = readColorTable(1 << ((packed & 0x07) + 1));
  }

  // Sub-blocks run until a zero-length one; used by both extensions and image
  // data, so both go through here.
  const readSubBlocks = (): Uint8Array => {
    const parts: Uint8Array[] = [];
    for (let size = byte(); size !== 0; size = byte()) {
      parts.push(bytes.subarray(at, at + size));
      at += size;
    }
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      joined.set(part, offset);
      offset += part.length;
    }
    return joined;
  };

  let transparentIndex: number | undefined;
  let pixels: Uint8Array | undefined;
  let lzwByteLength = 0;

  for (;;) {
    const block = byte();
    if (block === 0x3b || at > bytes.length) {
      break;
    }
    if (block === 0x21) {
      const label = byte();
      if (label === 0xf9) {
        const size = byte();
        if (size !== 4) {
          throw new Error(`Graphic control extension should be 4 bytes, got ${size}`);
        }
        const flags = byte();
        uint16(); // delay
        const index = byte();
        transparentIndex = flags & 0x01 ? index : undefined;
        if (byte() !== 0) {
          throw new Error('Graphic control extension not terminated');
        }
      } else {
        readSubBlocks();
      }
      continue;
    }
    if (block !== 0x2c) {
      throw new Error(`Unknown block 0x${block.toString(16)} at ${at - 1}`);
    }

    uint16(); // left
    uint16(); // top
    const frameWidth = uint16();
    const frameHeight = uint16();
    const imagePacked = byte();
    if (imagePacked & 0x80) {
      palette = readColorTable(1 << ((imagePacked & 0x07) + 1));
    }
    if (imagePacked & 0x40) {
      throw new Error('Interlaced GIFs are not decoded here');
    }

    const minCodeSize = byte();
    const start = at;
    const data = readSubBlocks();
    lzwByteLength = at - start;
    pixels = lzwDecompress(data, minCodeSize, frameWidth * frameHeight);
  }

  if (!pixels) {
    throw new Error('No image data in GIF');
  }
  return { width, height, palette, pixels, transparentIndex, lzwByteLength };
}

// Codes are packed least-significant bit first and grow as the table fills;
// the decoder has to widen at exactly the point the encoder did.
function lzwDecompress(data: Uint8Array, minCodeSize: number, expected: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const out = new Uint8Array(expected);
  let written = 0;
  const push = (values: number[]): void => {
    for (const value of values) {
      if (written < out.length) {
        out[written++] = value;
      }
    }
  };

  let table: number[][] = [];
  let codeSize = minCodeSize + 1;
  const reset = (): void => {
    table = [];
    for (let i = 0; i < clearCode; i++) {
      table.push([i]);
    }
    table.push([], []); // clear and end occupy their slots
    codeSize = minCodeSize + 1;
  };
  reset();

  let bitBuffer = 0;
  let bitCount = 0;
  let at = 0;
  let previous: number[] | null = null;

  for (;;) {
    while (bitCount < codeSize) {
      if (at >= data.length) {
        return out;
      }
      bitBuffer |= data[at++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;

    if (code === clearCode) {
      reset();
      previous = null;
      continue;
    }
    if (code === endCode) {
      return out;
    }

    let entry: number[];
    if (code < table.length) {
      entry = table[code];
    } else if (code === table.length && previous) {
      // The encoder may emit a code it has only just defined, in the one case
      // where the sequence is its own prefix plus its own first symbol.
      entry = [...previous, previous[0]];
    } else {
      throw new Error(`Bad LZW code ${code} (table has ${table.length})`);
    }

    push(entry);
    if (previous) {
      table.push([...previous, entry[0]]);
    }
    // Outside the `if`, so the very first code after a Clear counts too: the
    // encoder tests its own table size after every code it writes, including
    // the one that defines nothing, and the two have to widen in lockstep.
    if (table.length >= 1 << codeSize && codeSize < 12) {
      codeSize++;
    }
    previous = entry;
  }
}
