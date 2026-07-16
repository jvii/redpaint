import { describe, it, expect } from 'vitest';
import { stampRect, maskOffset, scratchSize, EFFECT_APRON } from '../../src/algorithm/effectRect';

describe('scratchSize', () => {
  it('adds the apron on every side', () => {
    expect(EFFECT_APRON).toBe(1);
    expect(scratchSize(4, 3)).toEqual({ w: 6, h: 5 });
  });
});

describe('stampRect', () => {
  // 4x3 brush fully inside a 100x50 canvas at origin (10, 20).
  // Copy region (with apron): canvas x 9..15, y 19..24 (exclusive ends).
  it('computes copy, quad and texcoords for an unclipped stamp', () => {
    const r = stampRect({ x: 10, y: 20 }, 4, 3, 100, 50);
    expect(r).toEqual({
      srcX: 9,
      srcY: 50 - 24, // GL flip: canvasH - copyBottomExclusive
      dstX: 0,
      dstY: 0,
      w: 6,
      h: 5,
      quadX: 10,
      quadY: 20,
      quadW: 4,
      quadH: 3,
      // written area inside the 6x5 scratch: local x 1..5, local y (top) 1..4
      u0: 1 / 6,
      v0: (5 - 4) / 5, // bottom edge: scratchH - localBottom
      u1: 5 / 6,
      v1: (5 - 1) / 5, // top edge: scratchH - localTop
    });
  });

  it('clips at the canvas top-left corner and offsets the scratch destination', () => {
    // 4x3 brush at (-2, -1): written area is x 0..2, y 0..2
    const r = stampRect({ x: -2, y: -1 }, 4, 3, 100, 50);
    expect(r).not.toBeNull();
    // copy region clamps to canvas x 0..3, y 0..3
    expect(r!.srcX).toBe(0);
    expect(r!.srcY).toBe(50 - 3);
    expect(r!.w).toBe(3); // apron-extended left edge -3..3 clamps to 0..3
    expect(r!.h).toBe(3);
    // destination inside scratch keeps brush-local alignment:
    // local x of canvas x0=0 is 0 - (-2 - 1) = 3
    expect(r!.dstX).toBe(3);
    // local y (top) of canvas y0=0 is 0 - (-1 - 1) = 2; GL: scratchH - (2 + 3)
    expect(r!.dstY).toBe(5 - 5);
    expect(r!.quadX).toBe(0);
    expect(r!.quadY).toBe(0);
    expect(r!.quadW).toBe(2);
    expect(r!.quadH).toBe(2);
  });

  it('returns null when the brush is fully off-canvas', () => {
    expect(stampRect({ x: -10, y: 0 }, 4, 3, 100, 50)).toBeNull();
    expect(stampRect({ x: 100, y: 0 }, 4, 3, 100, 50)).toBeNull();
    expect(stampRect({ x: 0, y: 50 }, 4, 3, 100, 50)).toBeNull();
  });
});

describe('maskOffset', () => {
  it('maps a current-stamp texcoord into the previous stamp frame', () => {
    // brush moved +3 in x, +2 in y (canvas y down); scratch 6x5
    expect(maskOffset({ x: 10, y: 20 }, { x: 13, y: 22 }, 6, 5)).toEqual({
      du: 3 / 6,
      dv: -2 / 5, // canvas y down = GL v down: v_prev = v_cur - dy/scratchH
    });
  });

  it('is zero for a stationary stamp', () => {
    expect(maskOffset({ x: 5, y: 5 }, { x: 5, y: 5 }, 6, 5)).toEqual({ du: 0, dv: 0 });
  });
});
