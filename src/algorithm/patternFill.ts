import { Point } from '../types';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { ALPHA_INDEXED } from '../domain/CanvasColorIndex';
import { GradientShape, ShapeGeometry, shapeGeometry } from './gradientFill';

// DPaint's Pattern fill: a captured brush bitmap tiled edge-to-edge from a
// fixed canvas origin (0,0) — the same anchor DPaint's own hardware-blitter
// tiling used, so multiple separately-filled shapes show one continuous,
// aligned pattern instead of each restarting the tile at its own bounding
// box (see docs/pattern-fill.md and the Fill Style requester,
// src/components/fillStyle/). Indexed-only for now: a true-color captured
// pixel is treated the same as a transparent one (skipped) rather than
// erroring — see BrushColorIndex's alpha-tag scheme.

// The pattern pixel at canvas position (x, y). Returns null for a
// transparent (or true-color, unsupported for now) pattern pixel — the
// caller should skip that point, leaving existing canvas content showing
// through, matching the brush-stamp shader's own transparency handling
// (DrawImageIndexer.ts discards on ALPHA_TRANSPARENT). Otherwise returns the
// 1-based PaintColor.colorNumber.
export function patternColorAt(pattern: BrushColorIndex, x: number, y: number): number | null {
  const { width, height, indexArray } = pattern;
  const col = ((x % width) + width) % width;
  const rowFromTop = ((y % height) + height) % height;
  // indexArray rows are stored bottom-up (BrushColorIndex's own convention,
  // shared with the main canvas texture), so the row that visually sits
  // `rowFromTop` pixels down from the pattern's own top lives at the
  // mirrored offset from the start of the array.
  const row = height - 1 - rowFromTop;
  const i = (row * width + col) * 4;
  if (indexArray[i + 3] !== ALPHA_INDEXED) {
    return null;
  }
  return indexArray[i] + 1;
}

// Buckets an arbitrary point set by the pattern pixel each point lands on,
// dropping points on a transparent pattern pixel. Only caller is
// FloodFillTool — its region comes from pixel connectivity, not geometry, so
// (like bucketPointsByGradient) it has no closed form to hand a shader.
// Returns one Point[] per distinct resulting color id; the caller issues one
// ordinary single-color draw call per bucket.
export function bucketPointsByPattern(
  points: Point[],
  pattern: BrushColorIndex
): Map<number, Point[]> {
  const buckets = new Map<number, Point[]>();
  for (const point of points) {
    const colorId = patternColorAt(pattern, point.x, point.y);
    if (colorId === null) {
      continue;
    }
    const bucket = buckets.get(colorId);
    if (bucket) {
      bucket.push(point);
    } else {
      buckets.set(colorId, [point]);
    }
  }
  return buckets;
}

// Everything the Pattern GPU shaders need, computed once per draw call —
// the GPU-path analog of bucketPointsByPattern above, for the shapes that
// DO have a closed form (filled rect/circle/ellipse/polygon). Shares its
// shape bounding-quad/center/radius/rotation math with Gradient fill's own
// uniform prep (shapeGeometry, gradientFill.ts) rather than recomputing the
// rotated-ellipse bounding box a second time.
export interface PatternUniforms extends ShapeGeometry {
  patternWidth: number;
  patternHeight: number;
}

export function patternFillUniforms(shape: GradientShape, pattern: BrushColorIndex): PatternUniforms {
  return {
    ...shapeGeometry(shape),
    patternWidth: pattern.width,
    patternHeight: pattern.height,
  };
}
