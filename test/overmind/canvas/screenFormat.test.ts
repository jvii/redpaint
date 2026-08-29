import { describe, it, expect } from 'vitest';
import { findFittingScreenFormat } from '../../../src/overmind/canvas/state';

describe('findFittingScreenFormat', () => {
  it('gives a standard Amiga size its own format', () => {
    expect(findFittingScreenFormat(320, 200)).toEqual({ id: 'loRes', standard: 'NTSC' });
    expect(findFittingScreenFormat(320, 256)).toEqual({ id: 'loRes', standard: 'PAL' });
    expect(findFittingScreenFormat(640, 200)).toEqual({ id: 'medRes', standard: 'NTSC' });
    expect(findFittingScreenFormat(640, 256)).toEqual({ id: 'medRes', standard: 'PAL' });
    expect(findFittingScreenFormat(320, 400)).toEqual({ id: 'interlace', standard: 'NTSC' });
    expect(findFittingScreenFormat(320, 512)).toEqual({ id: 'interlace', standard: 'PAL' });
    expect(findFittingScreenFormat(640, 400)).toEqual({ id: 'hiRes', standard: 'NTSC' });
    expect(findFittingScreenFormat(640, 512)).toEqual({ id: 'hiRes', standard: 'PAL' });
  });

  it('gives any other size the smallest format it fits inside', () => {
    expect(findFittingScreenFormat(1, 1)).toEqual({ id: 'loRes', standard: 'NTSC' });
    // taller than NTSC lo-res, so the same format's PAL frame
    expect(findFittingScreenFormat(300, 210)).toEqual({ id: 'loRes', standard: 'PAL' });
    // too wide for lo-res, and short enough for the shorter med-res frame
    expect(findFittingScreenFormat(500, 150)).toEqual({ id: 'medRes', standard: 'NTSC' });
    // too tall for either med-res frame and too wide for interlace
    expect(findFittingScreenFormat(400, 300)).toEqual({ id: 'hiRes', standard: 'NTSC' });
    expect(findFittingScreenFormat(200, 480)).toEqual({ id: 'interlace', standard: 'PAL' });
  });

  it('has no answer for an image larger than every format', () => {
    expect(findFittingScreenFormat(641, 512)).toBeNull();
    expect(findFittingScreenFormat(640, 513)).toBeNull();
    expect(findFittingScreenFormat(1920, 1080)).toBeNull();
  });
});
