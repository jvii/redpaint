import { Point } from '../types';

// The shape vocabulary shared by every GPU fill mode — Gradient
// (gradientFill.ts) and Pattern (patternFill.ts) both take one of these and
// both need the same bounding-quad/center/radius math out of it. It lived in
// gradientFill.ts while Gradient was the only GPU fill; Pattern reusing it
// wholesale (including the polygon vertex cap) is what moved it here, so
// neither fill mode imports its shape types from the other.

// A shape the GPU fill paths can handle
// (docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md). Flood fill is
// deliberately NOT here — its region comes from pixel connectivity, not
// geometry, so it has no closed form to hand a shader at all. Polygon *is*
// geometry (SymmetryBrush already resolves each copy's vertices to final
// absolute coordinates on the CPU before this ever runs), so its fragment
// shader does a bounded-loop point-in-polygon test instead of a closed-form
// inside test — see MAX_FILL_POLYGON_VERTICES.
export type FillShape =
  | { kind: 'rect'; start: Point; end: Point }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'ellipse'; center: Point; radiusX: number; radiusY: number; rotationAngle: number }
  | { kind: 'polygon'; vertices: Point[] };

// WebGL1 (GLSL ES 1.00) requires uniform array sizes to be compile-time
// constants, so the polygon shader loop is bounded at this many vertices
// (baked into SHAPE_FILL_LIB's source text — see shapeFillShaderLib.ts). A
// polygon with more vertices than this falls back to the CPU path
// (fillStyleDraw.ts's drawStyledFilledShape checks against this same
// constant) rather than silently truncating.
export const MAX_FILL_POLYGON_VERTICES = 64;

// Everything the Gradient and Pattern GPU shaders both need from a
// FillShape: its bounding quad (the actual draw target — a quad the shader
// then discards outside of), center/radii/rotation (the ellipse inside-test),
// and polygon vertices. Shared so the rotated-ellipse bounding-box math (the
// one part of this that's easy to get subtly wrong) has a single source of
// truth.
export type ShapeGeometry = {
  shapeKind: 0 | 1 | 2 | 3; // rect | circle | ellipse | polygon
  center: Point;
  radiusX: number;
  radiusY: number;
  rotation: number; // radians
  left: number; // inclusive pixel bounds = the bounding quad to draw
  top: number;
  right: number;
  bottom: number;
  vertices: Point[]; // polygon only; empty for every other shape kind
};

export function shapeGeometry(shape: FillShape): ShapeGeometry {
  let center: Point;
  let radiusX = 0;
  let radiusY = 0;
  let rotation = 0;
  let left: number;
  let top: number;
  let right: number;
  let bottom: number;

  if (shape.kind === 'rect') {
    left = Math.min(shape.start.x, shape.end.x);
    right = Math.max(shape.start.x, shape.end.x);
    top = Math.min(shape.start.y, shape.end.y);
    bottom = Math.max(shape.start.y, shape.end.y);
    center = { x: (left + right) / 2, y: (top + bottom) / 2 };
    radiusX = (right - left) / 2;
    radiusY = (bottom - top) / 2;
  } else if (shape.kind === 'circle') {
    center = shape.center;
    radiusX = shape.radius;
    radiusY = shape.radius;
    left = shape.center.x - shape.radius;
    right = shape.center.x + shape.radius;
    top = shape.center.y - shape.radius;
    bottom = shape.center.y + shape.radius;
  } else if (shape.kind === 'ellipse') {
    center = shape.center;
    radiusX = shape.radiusX;
    radiusY = shape.radiusY;
    rotation = shape.rotationAngle * (Math.PI / 180);
    // extents of a rotated ellipse's axis-aligned bounding box
    const c = Math.abs(Math.cos(rotation));
    const s = Math.abs(Math.sin(rotation));
    const extentX = radiusX * c + radiusY * s;
    const extentY = radiusX * s + radiusY * c;
    left = Math.floor(shape.center.x - extentX);
    right = Math.ceil(shape.center.x + extentX);
    top = Math.floor(shape.center.y - extentY);
    bottom = Math.ceil(shape.center.y + extentY);
  } else {
    left = Math.min(...shape.vertices.map((v) => v.x));
    right = Math.max(...shape.vertices.map((v) => v.x));
    top = Math.min(...shape.vertices.map((v) => v.y));
    bottom = Math.max(...shape.vertices.map((v) => v.y));
    center = { x: (left + right) / 2, y: (top + bottom) / 2 };
  }

  return {
    shapeKind:
      shape.kind === 'rect' ? 0 : shape.kind === 'circle' ? 1 : shape.kind === 'ellipse' ? 2 : 3,
    center,
    radiusX,
    radiusY,
    rotation,
    left,
    top,
    right,
    bottom,
    vertices: shape.kind === 'polygon' ? shape.vertices : [],
  };
}
