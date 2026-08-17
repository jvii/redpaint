import { describe, expect, test } from 'vitest';
import { thresholdCoverage } from '../../src/algorithm/glyphRaster';

// thresholdCoverage is the half of the rasterizer that decides pixels; the
// other half needs a browser that actually draws text, and is exercised in the
// app. Its contract is area coverage: an output pixel is set when at least half
// of its subsamples were covered.

const SUPERSAMPLE = 4;
const SAMPLES_PER_PIXEL = SUPERSAMPLE * SUPERSAMPLE;

// A supersampled image one output pixel wide and tall, whose subsamples carry
// `alphas` (row-major).
function onePixel(alphas: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SAMPLES_PER_PIXEL * 4);
  for (let i = 0; i < SAMPLES_PER_PIXEL; i++) {
    data[i * 4 + 3] = alphas[i];
  }
  return data;
}

function threshold(alphas: number[]): number {
  return thresholdCoverage(onePixel(alphas), SUPERSAMPLE, 1, 1)[0];
}

function covered(count: number): number[] {
  const alphas = new Array(SAMPLES_PER_PIXEL).fill(0);
  alphas.fill(255, 0, count);
  return alphas;
}

describe('thresholdCoverage', () => {
  test('fully covered pixel is set', () => {
    expect(threshold(covered(SAMPLES_PER_PIXEL))).toBe(1);
  });

  test('uncovered pixel is clear', () => {
    expect(threshold(covered(0))).toBe(0);
  });

  test('exactly half coverage is set', () => {
    expect(threshold(covered(SAMPLES_PER_PIXEL / 2))).toBe(1);
  });

  test('one subsample under half is clear', () => {
    expect(threshold(covered(SAMPLES_PER_PIXEL / 2 - 1))).toBe(0);
  });

  test('partial subsample alpha counts toward coverage', () => {
    // Every subsample half covered is the same area as half of them fully
    // covered, and lands on the same side of the threshold.
    expect(threshold(new Array(SAMPLES_PER_PIXEL).fill(128))).toBe(1);
    expect(threshold(new Array(SAMPLES_PER_PIXEL).fill(127))).toBe(0);
  });

  test('a partial edge is antialiasing that must not survive', () => {
    // A vertical edge covering a quarter of the pixel: the browser would have
    // drawn a mid-alpha pixel here, and it has to come out empty.
    const alphas = new Array(SAMPLES_PER_PIXEL).fill(0);
    for (let y = 0; y < SUPERSAMPLE; y++) {
      alphas[y * SUPERSAMPLE] = 255;
    }
    expect(threshold(alphas)).toBe(0);
  });

  test('resolves each output pixel from its own subsamples', () => {
    // Two output pixels side by side, only the right one covered.
    const width = SUPERSAMPLE * 2;
    const data = new Uint8ClampedArray(width * SUPERSAMPLE * 4);
    for (let y = 0; y < SUPERSAMPLE; y++) {
      for (let x = SUPERSAMPLE; x < width; x++) {
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
    expect(Array.from(thresholdCoverage(data, width, 2, 1))).toEqual([0, 1]);
  });
});
