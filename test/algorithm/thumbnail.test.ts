import { describe, it, expect } from 'vitest';
import { fitLetterboxed } from '../../src/algorithm/thumbnail';

describe('fitLetterboxed', () => {
  it('fills the box exactly for a square source', () => {
    expect(fitLetterboxed(16, 16, 64)).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  });

  it('letterboxes a wide source, centering the shrunk height', () => {
    expect(fitLetterboxed(32, 16, 64)).toEqual({ x: 0, y: 16, width: 64, height: 32 });
  });

  it('letterboxes a tall source, centering the shrunk width', () => {
    expect(fitLetterboxed(16, 32, 64)).toEqual({ x: 16, y: 0, width: 32, height: 64 });
  });

  it('upscales a source smaller than the box', () => {
    expect(fitLetterboxed(8, 8, 64)).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  });
});
