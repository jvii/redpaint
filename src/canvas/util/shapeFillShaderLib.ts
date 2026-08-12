// Shape inside-tests shared by the GPU fill shaders that need "is this fragment
// inside the shape, and where is it": Gradient (gradientShaderLib.ts, which
// layers axis/band math on top) and Pattern (patternShaderLib.ts, which just
// tiles from here). Single source of truth for the bounded-loop polygon math
// and the circle/ellipse row-span lookup, so a fix to either doesn't need to be
// repeated in two places.
//
// Declares every uniform that describes the shape itself: u_canvasHeight,
// u_shapeKind, u_center, and the polygon arrays (u_vertices/u_nextVertices/
// u_vertexCount). Consumers' own GLSL must NOT redeclare these (a duplicate
// `uniform` declaration is a GLSL compile error); each declares only the
// uniforms specific to its own fill mode (gradient bands, pattern size).
// SHAPE_FILL_UNIFORM_NAMES + applyShapeUniforms below are the JS side of the
// same split: the one place that looks up and sets exactly this set, so neither
// fill mode carries its own copy of the polygon packing.

import { Point } from '../../types';
import { MAX_FILL_POLYGON_VERTICES, ShapeGeometry } from '../../algorithm/fillShape';
import { ROW_SPAN_OFFSET } from './rowSpanTexture';

// Every uniform SHAPE_FILL_LIB declares. Each consumer concatenates its own
// names onto this list for its location lookup (see GRADIENT_UNIFORM_NAMES /
// PATTERN_UNIFORM_NAMES).
export const SHAPE_FILL_UNIFORM_NAMES = [
  'u_canvasHeight',
  'u_shapeKind',
  'u_center',
  'u_vertices',
  'u_nextVertices',
  'u_vertexCount',
];

// Sets every SHAPE_FILL_LIB uniform from one ShapeGeometry: the part of the
// per-draw uniform setup that's identical between Gradient and Pattern, and
// between each one's commit and preview path.
//
// u_nextVertices[i] duplicates u_vertices[(i+1) % count], computed here on the
// CPU rather than in the shader: WebGL1 fragment shaders only allow the bare
// loop-control variable as a dynamic array index (ANGLE rejects anything
// derived from it, e.g. a `j = i==0 ? count-1 : i-1` previous-vertex index,
// with "Index expression can only contain const or loop symbols"), so the
// shader can't compute "the next vertex" itself. Every edge is looked up as
// (u_vertices[i], u_nextVertices[i]) with the same bare `i` instead, at the
// cost of this second array.
export function applyShapeUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  geometry: ShapeGeometry
): void {
  gl.uniform1f(locations['u_canvasHeight'], gl.drawingBufferHeight);
  gl.uniform1i(locations['u_shapeKind'], geometry.shapeKind);
  gl.uniform2f(locations['u_center'], geometry.center.x, geometry.center.y);

  const vertices: Point[] = geometry.vertices;
  const count = vertices.length;
  const packedVertices = new Float32Array(MAX_FILL_POLYGON_VERTICES * 2);
  const packedNextVertices = new Float32Array(MAX_FILL_POLYGON_VERTICES * 2);
  for (let i = 0; i < count; i++) {
    packedVertices[i * 2] = vertices[i].x;
    packedVertices[i * 2 + 1] = vertices[i].y;
    const next = vertices[(i + 1) % count];
    packedNextVertices[i * 2] = next.x;
    packedNextVertices[i * 2 + 1] = next.y;
  }
  gl.uniform2fv(locations['u_vertices'], packedVertices);
  gl.uniform2fv(locations['u_nextVertices'], packedNextVertices);
  gl.uniform1f(locations['u_vertexCount'], count);
}

// Every fill program draws the same thing: one bounding quad in clip space, the
// fragment shader discarding whatever falls outside the shape. So all four of
// them (Gradient/Pattern x commit/preview) share this vertex shader: see
// drawShapeQuad (shapeFillDraw.ts), which feeds it.
export const FILL_VERTEX_SHADER = `
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
    }
    `;

export const SHAPE_FILL_LIB = `
    uniform float u_canvasHeight; // drawing buffer height in pixels
    uniform int u_shapeKind;      // 0 = rect, 1 = circle, 2 = ellipse, 3 = polygon
    uniform vec2 u_center;        // shape center, canvas coords (y down)
    uniform vec2 u_vertices[${MAX_FILL_POLYGON_VERTICES}]; // polygon only, absolute canvas coords
    uniform vec2 u_nextVertices[${MAX_FILL_POLYGON_VERTICES}]; // u_vertices[(i+1) % count], precomputed on the CPU
    uniform float u_vertexCount;  // polygon only, <= ${MAX_FILL_POLYGON_VERTICES}.0

    // Circle/ellipse membership and per-row bounds: a lookup against the exact
    // row-span table filledCircle/filledEllipse produce (algorithm/rowSpans.ts,
    // packed by rowSpanTexture.ts), which is what makes the GPU fills match the
    // CPU-rasterized solid fill pixel-for-pixel at the boundary. One texel per
    // local row; each packs that row's min/max local x as unsigned 16-bit (R/G
    // = min hi/lo, B/A = max hi/lo) biased by ROW_SPAN_OFFSET.
    //
    // Rebuilding a 16-bit value from two bytes needs highp. Mediump's exact
    // integer range (~±1024) is below what this reaches for all but small
    // shapes, so every consumer must declare highp where available.
    uniform sampler2D u_rowSpans;
    uniform float u_rowSpanYMin;
    uniform float u_rowSpanRowCount;
    const float ROW_SPAN_OFFSET = ${ROW_SPAN_OFFSET}.0;

    bool rowSpanInside(vec2 local, out float xMin, out float xMax) {
      float row = local.y - u_rowSpanYMin;
      if (row < 0.0 || row >= u_rowSpanRowCount) {
        return false;
      }
      vec4 texel = texture2D(u_rowSpans, vec2(0.5, (row + 0.5) / u_rowSpanRowCount));
      xMin = floor(texel.r * 255.0 + 0.5) * 256.0 + floor(texel.g * 255.0 + 0.5) - ROW_SPAN_OFFSET;
      xMax = floor(texel.b * 255.0 + 0.5) * 256.0 + floor(texel.a * 255.0 + 0.5) - ROW_SPAN_OFFSET;
      return local.x >= xMin && local.x <= xMax;
    }

    // Even-odd point-in-polygon test, the same rule and edge-crossing math as
    // shape.ts's filledPolygon, over a fixed-size loop (WebGL1 needs a
    // compile-time bound) that breaks at u_vertexCount. Also returns this
    // fragment's own row *run* bounds: a concave row can have several disjoint
    // runs, and a horizontalLine gradient needs the pair bracketing its own x.
    //
    // Every edge is read as (u_vertices[i], u_nextVertices[i]), both indexed by
    // the bare loop variable. WebGL1 fragment shaders accept nothing derived
    // from it as a dynamic index ("Index expression can only contain const or
    // loop symbols"), which is the only reason u_nextVertices exists.
    bool polygonRow(vec2 pix, out float runMin, out float runMax) {
      bool inside = false;
      runMin = -1.0e6;
      runMax = 1.0e6;
      for (int i = 0; i < ${MAX_FILL_POLYGON_VERTICES}; i++) {
        if (float(i) >= u_vertexCount) {
          break;
        }
        vec2 vi = u_vertices[i];
        vec2 vj = u_nextVertices[i];
        if ((vi.y > pix.y) != (vj.y > pix.y)) {
          float xCross = vi.x + (pix.y - vi.y) / (vj.y - vi.y) * (vj.x - vi.x);
          if (pix.x < xCross) {
            inside = !inside;
          }
          if (xCross <= pix.x && xCross > runMin) {
            runMin = xCross;
          }
          if (xCross > pix.x && xCross < runMax) {
            runMax = xCross;
          }
        }
      }
      return inside;
    }

    // The fragment's canvas pixel: gl_FragCoord is window-space with y up
    // and pixel centers at +0.5; flip y and floor to integer pixel coords.
    vec2 canvasPixel() {
      return floor(vec2(gl_FragCoord.x, u_canvasHeight - gl_FragCoord.y));
    }
    `;
