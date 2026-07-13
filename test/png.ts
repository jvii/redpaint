// A minimal PNG encoder/decoder for 8-bit grayscale, non-interlaced images —
// just enough to read and write the visual test fixtures under
// src/algorithm/__fixtures__/. Uses only Node's built-in zlib for the IDAT
// compression, so no image library is a dependency of the test suite; the
// fixtures are still real PNGs, openable in any image viewer.

import { deflateSync, inflateSync } from 'zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

export function encodePng(grayscale: Uint8Array, width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // one filter-type byte (0 = none) per scanline, then the raw pixel bytes
  const raw = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width + 1);
    raw[rowStart] = 0;
    raw.set(grayscale.subarray(y * width, (y + 1) * width), rowStart + 1);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

export function decodePng(png: Buffer): { grayscale: Uint8Array; width: number; height: number } {
  if (!png.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Not a PNG file');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let idat = Buffer.alloc(0);
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 0) {
        throw new Error('Only 8-bit grayscale PNGs are supported by this test decoder');
      }
    } else if (type === 'IDAT') {
      idat = Buffer.concat([idat, data]);
    }
    offset += 12 + length;
  }

  const raw = inflateSync(idat);
  const grayscale = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width + 1);
    if (raw[rowStart] !== 0) {
      throw new Error('Only unfiltered (filter type 0) PNG scanlines are supported');
    }
    grayscale.set(raw.subarray(rowStart + 1, rowStart + 1 + width), y * width);
  }
  return { grayscale, width, height };
}
