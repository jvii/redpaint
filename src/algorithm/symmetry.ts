// Deluxe Paint style symmetry: point transforms for an N-fold rotational
// (optionally mirrored) kaleidoscope around a center point.
// * pure, no side effects
// * adapted from the original DPaint PSYM.C (SymDo / SymSetNMir)

import { Point } from '../types';

export type SymmetrySettings = {
  center: Point;
  order: number; // number of rotational copies, 1..MAX_ORDER
  mirror: boolean; // also reflect each copy across the vertical axis
  // The display shape of a pixel (docs/pixel-aspect.md). A rotation is only a
  // rotation in a space where pixels are square, so points are mapped into one
  // and back. Omitted means square, which leaves every coordinate untouched.
  pixelAspect?: Point;
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

// DPaint's own cap (PSYM.C). Exported so the settings slider and the action
// that clamps the value can't drift from what this file will actually honor.
export const MAX_ORDER = 40;

function clampOrder(order: number): number {
  return Math.max(1, Math.min(MAX_ORDER, Math.floor(order)));
}

// Rotation around center (screen y-down), matching PSYM.C's convention:
//   x' = cx + dx*cos + dy*sin
//   y' = cy - dx*sin + dy*cos
//
// The offset is scaled by the pixel shape on the way in and back out again, so
// the angle is the one seen rather than the one in the raster. PSYM.C's SymDo
// does exactly this with VMapX/PMapX around the same arithmetic.
function rotatePoint(center: Point, cos: number, sin: number, aspect: Point): PointTransform {
  return (p: Point): Point => {
    const dx = (p.x - center.x) * aspect.x;
    const dy = (p.y - center.y) * aspect.y;
    return {
      x: Math.round(center.x + (dx * cos + dy * sin) / aspect.x),
      y: Math.round(center.y + (-dx * sin + dy * cos) / aspect.y),
    };
  };
}

// Rotation followed by reflection across the vertical line through the center.
// The reflection needs no correction of its own: flipping about a vertical
// line is the same operation whatever shape the pixels are.
function mirrorRotatePoint(center: Point, cos: number, sin: number, aspect: Point): PointTransform {
  const rotate = rotatePoint(center, cos, sin, aspect);
  return (p: Point): Point => {
    const rotated = rotate(p);
    return { x: 2 * center.x - rotated.x, y: rotated.y };
  };
}

// Returns the symmetry copies for the given settings. Copy 0 is always the
// identity. With mirror off there are `order` copies; with mirror on there are
// 2 * order, interleaved as [rot0, mirror0, rot1, mirror1, ...].
export function symmetryCopies(settings: SymmetrySettings): SymmetryCopy[] {
  const { center, mirror } = settings;
  const aspect = settings.pixelAspect ?? { x: 1, y: 1 };
  const order = clampOrder(settings.order);
  const copies: SymmetryCopy[] = [];

  for (let j = 0; j < order; j++) {
    const angleDegrees = (j * 360) / order;
    const a = (j * 2 * Math.PI) / order;
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    copies.push({ point: rotatePoint(center, cos, sin, aspect), angleDegrees, mirror: false });
    if (mirror) {
      copies.push({
        point: mirrorRotatePoint(center, cos, sin, aspect),
        angleDegrees,
        mirror: true,
      });
    }
  }

  return copies;
}

// Convenience wrapper returning just the point transforms (used where only
// positions matter, e.g. flood fill seeds and the overlay position indicator).
export function symmetryTransforms(settings: SymmetrySettings): PointTransform[] {
  return symmetryCopies(settings).map((copy): PointTransform => copy.point);
}
