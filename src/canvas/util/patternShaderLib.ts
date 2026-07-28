// Shared GLSL for the GPU Pattern fill — the DPaint "Pattern"/"From Brush"
// fill mode, sitting alongside Gradient (gradientShaderLib.ts) and reusing
// its shape inside-tests (shapeFillShaderLib.ts) rather than a second copy
// of the polygon/row-span math. Both the commit path (PatternGeometricIndexer)
// and preview path (OverlayPatternRenderer) embed PATTERN_LIB and differ
// only in what they do with the fetched texel — see GRADIENT_LIB's own
// header comment for the shared-lib convention this mirrors.
//
// Tiling: mod(pix, u_patternSize) anchors the tile to the fixed canvas
// origin (0, 0) — DPaint's own hardware-blitter tiling anchored the same
// way, so multiple separately-filled shapes show one continuous, aligned
// pattern (see src/algorithm/patternFill.ts's patternColorAt, the CPU
// twin this must stay pixel-identical with). u_pattern is always sampled
// with NEAREST filtering (no blending across the alpha-tag boundary) and
// wrap mode is irrelevant here — mod() keeps the sampled uv inside [0, 1)
// itself, deliberately not relying on gl.REPEAT (see the design note this
// followed: sharing a texture's hardware wrap mode with the unrelated
// brush-stamp code in DrawImageIndexer.ts would couple the two features).

import { MAX_GRADIENT_POLYGON_VERTICES } from '../../algorithm/gradientFill';
import { PatternUniforms } from '../../algorithm/patternFill';
import { SHAPE_FILL_LIB } from './shapeFillShaderLib';

// Shared by both PatternGeometricIndexer and OverlayPatternRenderer: every
// uniform PATTERN_LIB declares except u_palette (the overlay-only sampler
// that resolves the fetched index to a display color) and u_pattern/
// u_rowSpans (texture unit numbers each caller binds once at
// program-construction time — their locations are still looked up here
// since applyPatternUniforms doesn't set them).
export const PATTERN_UNIFORM_NAMES = [
  'u_canvasHeight',
  'u_shapeKind',
  'u_center',
  'u_vertices',
  'u_nextVertices',
  'u_vertexCount',
  'u_pattern',
  'u_patternSize',
  'u_rowSpans',
  'u_rowSpanYMin',
  'u_rowSpanRowCount',
];

// Sets every PATTERN_LIB uniform (except u_pattern/u_rowSpans, texture unit
// numbers each caller already binds once at program-construction time, and
// u_palette, overlay-only, and u_rowSpanYMin/u_rowSpanRowCount, set
// alongside the row-span texture itself by RowSpanTexture.use +
// applyRowSpanUniforms) from one PatternUniforms value.
export function applyPatternUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  u: PatternUniforms
): void {
  gl.uniform1f(locations['u_canvasHeight'], gl.drawingBufferHeight);
  gl.uniform1i(locations['u_shapeKind'], u.shapeKind);
  gl.uniform2f(locations['u_center'], u.center.x, u.center.y);
  gl.uniform2f(locations['u_patternSize'], u.patternWidth, u.patternHeight);

  // Same fixed-size polygon array packing as applyGradientUniforms — see
  // its own comment (gradientShaderLib.ts) for why u_nextVertices exists.
  const count = u.vertices.length;
  const packedVertices = new Float32Array(MAX_GRADIENT_POLYGON_VERTICES * 2);
  const packedNextVertices = new Float32Array(MAX_GRADIENT_POLYGON_VERTICES * 2);
  for (let i = 0; i < count; i++) {
    packedVertices[i * 2] = u.vertices[i].x;
    packedVertices[i * 2 + 1] = u.vertices[i].y;
    const next = u.vertices[(i + 1) % count];
    packedNextVertices[i * 2] = next.x;
    packedNextVertices[i * 2 + 1] = next.y;
  }
  gl.uniform2fv(locations['u_vertices'], packedVertices);
  gl.uniform2fv(locations['u_nextVertices'], packedNextVertices);
  gl.uniform1f(locations['u_vertexCount'], count);
}

export const PATTERN_LIB = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    ${SHAPE_FILL_LIB}

    uniform int u_shapeKind;      // 0 = rect, 1 = circle, 2 = ellipse, 3 = polygon
    uniform vec2 u_center;        // shape center, canvas coords (y down)
    uniform sampler2D u_pattern;  // the captured pattern bitmap
    uniform vec2 u_patternSize;   // pattern width/height in pixels

    // The pattern's raw (unresolved) texel for this fragment, tiled from
    // the fixed canvas origin (0,0) — or discards, either because the
    // fragment is outside the shape, or the tiled pattern pixel is
    // transparent/true-color (indexed-only for now — see patternColorAt,
    // the CPU twin this stays pixel-identical with).
    vec4 patternTexel() {
      vec2 pix = canvasPixel();

      if (u_shapeKind == 3) {
        float runMin;
        float runMax;
        if (!polygonRow(pix, runMin, runMax)) {
          discard;
        }
      } else if (u_shapeKind == 1 || u_shapeKind == 2) {
        vec2 local = pix - u_center;
        float rowXMin;
        float rowXMax;
        if (!rowSpanInside(local, rowXMin, rowXMax)) {
          discard;
        }
      }

      vec2 tile = mod(pix, u_patternSize);
      // The uploaded texture's rows are bottom-up (BrushColorIndex's own
      // storage convention, see patternColorAt) — texture v=0 samples the
      // first (bottom) row, so the row that visually sits tile.y pixels
      // down from the pattern's own top needs the mirrored v.
      vec2 uv = vec2(
        (tile.x + 0.5) / u_patternSize.x,
        (u_patternSize.y - tile.y - 0.5) / u_patternSize.y
      );
      vec4 texel = texture2D(u_pattern, uv);
      // Only the indexed tag (~127/255) is supported; both transparent
      // (~0) and true-color (~255) tiles are skipped, same as
      // patternColorAt's own ALPHA_INDEXED-only check.
      if (texel.a < 0.4 || texel.a > 0.6) {
        discard;
      }
      return texel;
    }
    `;
