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

// Content-sniffs a FORM ILBM/PBM header from just the first 12 bytes (no
// full readForm parse needed) — for detecting an IFF file by content rather
// than extension, which in the wild varies (.iff, .lbm, .ilbm) and lies.
// Safe to call on a short/partial read, e.g. a File.slice(0, 12).
export function isIlbmHeader(head: Uint8Array): boolean {
  if (head.length < 12) {
    return false;
  }
  const id = (o: number): string =>
    String.fromCharCode(head[o], head[o + 1], head[o + 2], head[o + 3]);
  return id(0) === 'FORM' && (id(8) === 'ILBM' || id(8) === 'PBM ');
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
