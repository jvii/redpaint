import { PaintColor, Point } from '../types';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR } from '../domain/CanvasColorIndex';
import { FillShape, ShapeGeometry, shapeGeometry } from './fillShape';

// DPaint's Pattern fill: a captured brush bitmap tiled edge-to-edge from a
// fixed canvas origin (0,0), the same anchor DPaint's own hardware-blitter
// tiling used, so multiple separately-filled shapes show one continuous,
// aligned pattern instead of each restarting the tile at its own bounding box
// (see the Fill Style requester, src/components/fillStyle/).
//
// A pattern carries whatever the captured brush carried, indexed or true-color,
// and paints it through unchanged. The same rule stamping that brush directly
// follows (DrawImageIndexer writes a true-color brush pixel as a true-color
// canvas pixel, without consulting trueColorEnabled). Only *computed* colors
// need a write policy, which is why the paint effects have one and this
// doesn't; reconciling true-color content with an indexed document happens in
// one designated place, applyScreenFormat's flatten.

// The color the pattern paints at canvas position (x, y): a palette index for
// an indexed pattern pixel, a literal RGB for a true-color one. Returns null
// for a transparent pixel: the caller skips that point, leaving existing canvas
// content showing through, matching the brush-stamp shader's own transparency
// handling (DrawImageIndexer discards on ALPHA_TRANSPARENT).
export function patternColorAt(
  pattern: BrushColorIndex,
  x: number,
  y: number
): PaintColor | null {
  const { width, height, indexArray } = pattern;
  const col = ((x % width) + width) % width;
  const rowFromTop = ((y % height) + height) % height;
  // indexArray rows are stored bottom-up (BrushColorIndex's own convention,
  // shared with the main canvas texture), so the row that visually sits
  // `rowFromTop` pixels down from the pattern's own top lives at the
  // mirrored offset from the start of the array.
  const row = height - 1 - rowFromTop;
  const i = (row * width + col) * 4;
  if (indexArray[i + 3] === ALPHA_TRUECOLOR) {
    return {
      kind: 'rgb',
      color: { r: indexArray[i], g: indexArray[i + 1], b: indexArray[i + 2] },
    };
  }
  if (indexArray[i + 3] !== ALPHA_INDEXED) {
    return null; // transparent
  }
  return { kind: 'index', colorNumber: indexArray[i] + 1 };
}

// Buckets an arbitrary point set by the color the pattern paints there,
// dropping points on a transparent pattern pixel. Only caller is FloodFillTool.
// Its region comes from pixel connectivity, not geometry, so (like
// bucketPointsByGradient) it has no closed form to hand a shader. Returns one
// entry per distinct resulting color; the caller issues one ordinary
// single-color draw call per bucket.
//
// Keyed by a string rather than the color id, since a true-color pattern's
// colors have no id ('i:<n>' for indexed, 'c:<r>,<g>,<b>' for RGB), with the
// PaintColor carried alongside so the caller never re-derives it.
export function bucketPointsByPattern(
  points: Point[],
  pattern: BrushColorIndex
): Map<string, { color: PaintColor; points: Point[] }> {
  const buckets = new Map<string, { color: PaintColor; points: Point[] }>();
  for (const point of points) {
    const color = patternColorAt(pattern, point.x, point.y);
    if (color === null) {
      continue;
    }
    const key =
      color.kind === 'index'
        ? `i:${color.colorNumber}`
        : `c:${color.color.r},${color.color.g},${color.color.b}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.points.push(point);
    } else {
      buckets.set(key, { color, points: [point] });
    }
  }
  return buckets;
}

// Everything the Pattern GPU shaders need, computed once per draw call. The
// GPU-path analog of bucketPointsByPattern above, for the shapes that DO have a
// closed form (filled rect/circle/ellipse/polygon). Shares its shape
// bounding-quad/center/radius/rotation math with Gradient fill's own uniform
// prep (shapeGeometry, fillShape.ts) rather than recomputing the
// rotated-ellipse bounding box a second time.
export type PatternUniforms = ShapeGeometry & {
  patternWidth: number;
  patternHeight: number;
};

export function patternFillUniforms(shape: FillShape, pattern: BrushColorIndex): PatternUniforms {
  return {
    ...shapeGeometry(shape),
    patternWidth: pattern.width,
    patternHeight: pattern.height,
  };
}
