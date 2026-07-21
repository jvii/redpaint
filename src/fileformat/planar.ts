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
