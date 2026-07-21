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
