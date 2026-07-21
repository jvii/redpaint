import { test } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeIlbm } from '../../src/fileformat/ilbm';

// Not a test — a generator for a manual-testing sample. Run with:
//   WRITE_SAMPLE=1 npm test
// Writes test/fileformat/__fixtures__/sample.iff: 64x32, 8-color bars.
test.runIf(process.env.WRITE_SAMPLE === '1')('writes sample.iff', () => {
  const width = 64;
  const height = 32;
  const palette = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 160, b: 0 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 200, b: 0 },
    { r: 0, g: 100, b: 255 },
    { r: 160, g: 0, b: 255 },
  ];
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = Math.floor(x / 8);
    }
  }
  const cycleRanges = [{ low: 2, high: 7, rate: 8192, active: true, reverse: false }];
  mkdirSync('test/fileformat/__fixtures__', { recursive: true });
  writeFileSync(
    'test/fileformat/__fixtures__/sample.iff',
    encodeIlbm({ width, height, palette, pixels, cycleRanges })
  );
});
