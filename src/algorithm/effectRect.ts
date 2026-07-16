import { Point } from '../types';

// Clip math for effect stamps (see docs/effects.md). All the GL Y-flips live
// here, tested, so EffectIndexer stays a thin GL-call layer: canvas coords
// have a top-left origin, GL textures/framebuffers a bottom-left one, and the
// scratch textures are brush-local with a 1px apron on every side.

export const EFFECT_APRON = 1;

export interface StampRect {
  srcX: number;
  srcY: number;
  dstX: number;
  dstY: number;
  w: number;
  h: number;
  quadX: number;
  quadY: number;
  quadW: number;
  quadH: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export function scratchSize(brushW: number, brushH: number): { w: number; h: number } {
  return { w: brushW + 2 * EFFECT_APRON, h: brushH + 2 * EFFECT_APRON };
}

export function stampRect(
  origin: Point,
  brushW: number,
  brushH: number,
  canvasW: number,
  canvasH: number
): StampRect | null {
  // written area (no apron), clamped to the canvas
  const qx0 = Math.max(origin.x, 0);
  const qy0 = Math.max(origin.y, 0);
  const qx1 = Math.min(origin.x + brushW, canvasW);
  const qy1 = Math.min(origin.y + brushH, canvasH);
  if (qx1 <= qx0 || qy1 <= qy0) {
    return null; // fully off-canvas
  }

  // copied area (with apron), clamped to the canvas
  const cx0 = Math.max(origin.x - EFFECT_APRON, 0);
  const cy0 = Math.max(origin.y - EFFECT_APRON, 0);
  const cx1 = Math.min(origin.x + brushW + EFFECT_APRON, canvasW);
  const cy1 = Math.min(origin.y + brushH + EFFECT_APRON, canvasH);

  const scratch = scratchSize(brushW, brushH);
  // brush-local coordinates measure from the scratch's top-left, which sits
  // at canvas (origin - apron)
  const localX = cx0 - (origin.x - EFFECT_APRON);
  const localYTop = cy0 - (origin.y - EFFECT_APRON);
  const h = cy1 - cy0;

  const lqx0 = qx0 - (origin.x - EFFECT_APRON);
  const lqx1 = qx1 - (origin.x - EFFECT_APRON);
  const lqy0 = qy0 - (origin.y - EFFECT_APRON);
  const lqy1 = qy1 - (origin.y - EFFECT_APRON);

  return {
    srcX: cx0,
    srcY: canvasH - cy1,
    dstX: localX,
    dstY: scratch.h - (localYTop + h),
    w: cx1 - cx0,
    h,
    quadX: qx0,
    quadY: qy0,
    quadW: qx1 - qx0,
    quadH: qy1 - qy0,
    u0: lqx0 / scratch.w,
    v0: (scratch.h - lqy1) / scratch.h,
    u1: lqx1 / scratch.w,
    v1: (scratch.h - lqy0) / scratch.h,
  };
}

// Offset that maps a fragment's brush-local texcoord in the current stamp to
// the same canvas pixel's texcoord in the previous stamp's scratch frame
// (used to sample the previous stamp's coverage mask).
export function maskOffset(
  prevOrigin: Point,
  curOrigin: Point,
  scratchW: number,
  scratchH: number
): { du: number; dv: number } {
  return {
    du: (curOrigin.x - prevOrigin.x) / scratchW,
    dv: (prevOrigin.y - curOrigin.y) / scratchH,
  };
}
