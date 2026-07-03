// Deluxe Paint style symmetry: point transforms for an N-fold rotational
// (optionally mirrored) kaleidoscope around a center point.
// * pure, no side effects
// * adapted from the original DPaint PSYM.C (SymDo / SymSetNMir)

import { Point } from '../types';

export type SymmetrySettings = {
  center: Point;
  order: number; // number of rotational copies, 1..40
  mirror: boolean; // also reflect each copy across the vertical axis
};

export type PointTransform = (p: Point) => Point;

// One copy of a stroke in the kaleidoscope: how to map a point into it, plus
// the rotation angle and mirror flag (available to primitives that carry their
// own orientation).
export type SymmetryCopy = {
  point: PointTransform;
  angleDegrees: number; // rotation of this copy, 0 for the identity
  mirror: boolean;
};

const MAX_ORDER = 40;

function clampOrder(order: number): number {
  return Math.max(1, Math.min(MAX_ORDER, Math.floor(order)));
}

// Rotation around center (screen y-down), matching PSYM.C's convention:
//   x' = cx + dx*cos + dy*sin
//   y' = cy - dx*sin + dy*cos
function rotatePoint(center: Point, cos: number, sin: number): PointTransform {
  return (p: Point): Point => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return {
      x: Math.round(center.x + dx * cos + dy * sin),
      y: Math.round(center.y - dx * sin + dy * cos),
    };
  };
}

// Rotation followed by reflection across the vertical line through the center.
function mirrorRotatePoint(center: Point, cos: number, sin: number): PointTransform {
  return (p: Point): Point => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const rx = center.x + dx * cos + dy * sin;
    const ry = center.y - dx * sin + dy * cos;
    return { x: Math.round(2 * center.x - rx), y: Math.round(ry) };
  };
}

// Returns the symmetry copies for the given settings. Copy 0 is always the
// identity. With mirror off there are `order` copies; with mirror on there are
// 2 * order, interleaved as [rot0, mirror0, rot1, mirror1, ...].
export function symmetryCopies(settings: SymmetrySettings): SymmetryCopy[] {
  const { center, mirror } = settings;
  const order = clampOrder(settings.order);
  const copies: SymmetryCopy[] = [];

  for (let j = 0; j < order; j++) {
    const angleDegrees = (j * 360) / order;
    const a = (j * 2 * Math.PI) / order;
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    copies.push({ point: rotatePoint(center, cos, sin), angleDegrees, mirror: false });
    if (mirror) {
      copies.push({ point: mirrorRotatePoint(center, cos, sin), angleDegrees, mirror: true });
    }
  }

  return copies;
}

// Convenience wrapper returning just the point transforms (used where only
// positions matter, e.g. flood fill seeds and the overlay position indicator).
export function symmetryTransforms(settings: SymmetrySettings): PointTransform[] {
  return symmetryCopies(settings).map((copy): PointTransform => copy.point);
}
