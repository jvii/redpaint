// Golden-file assertion for shape tests: compares a rasterized PixelGrid
// against a checked-in PNG, decoding it back to pixels rather than comparing
// bytes — so the check is "same shape", immune to encoder/compression
// changes. Missing fixtures (first run) or UPDATE_FIXTURES=1 (deliberate
// change) write the PNG instead of asserting: run the algorithm change,
// regenerate, open the PNGs to confirm the shape still looks right, commit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { expect } from 'vitest';
import { decodePng, encodePng } from './png';
import { PixelGrid } from './pixelGrid';

function toGrayscale(grid: PixelGrid): Uint8Array {
  const grayscale = new Uint8Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) {
    grayscale[i] = grid.data[i] ? 0 : 255; // drawn = black, background = white
  }
  return grayscale;
}

export function expectMatchesFixture(grid: PixelGrid, fixturePath: string): void {
  const png = encodePng(toGrayscale(grid), grid.width, grid.height);

  if (!existsSync(fixturePath) || process.env.UPDATE_FIXTURES) {
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, png);
    return;
  }

  const expected = decodePng(readFileSync(fixturePath));
  const actual = decodePng(png);
  expect({ width: actual.width, height: actual.height, pixels: Array.from(actual.grayscale) }).toEqual(
    { width: expected.width, height: expected.height, pixels: Array.from(expected.grayscale) }
  );
}
