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

import { PatternUniforms } from '../../algorithm/patternFill';
import { ALPHA_TAG_LIB } from './alphaTagShaderLib';
import {
  applyShapeUniforms,
  SHAPE_FILL_LIB,
  SHAPE_FILL_UNIFORM_NAMES,
} from './shapeFillShaderLib';

// Shared by both PatternGeometricIndexer and OverlayPatternRenderer: every
// uniform PATTERN_LIB declares (the shape-describing ones via
// SHAPE_FILL_UNIFORM_NAMES) except u_palette, the overlay-only sampler that
// resolves the fetched index to a display color. u_pattern/u_rowSpans are
// texture unit numbers each caller binds once at program-construction time —
// their locations are still looked up here since applyPatternUniforms
// doesn't set them.
export const PATTERN_UNIFORM_NAMES = [
  ...SHAPE_FILL_UNIFORM_NAMES,
  'u_pattern',
  'u_patternSize',
  'u_rowSpans',
  'u_rowSpanYMin',
  'u_rowSpanRowCount',
];

// Sets every PATTERN_LIB uniform from one PatternUniforms value: the
// shape-describing ones via applyShapeUniforms, then Pattern's own. Not set
// here: u_pattern/u_rowSpans (texture unit numbers each caller binds once at
// program-construction time), u_palette (overlay-only), and
// u_rowSpanYMin/u_rowSpanRowCount (set alongside the row-span texture itself
// by RowSpanTexture.use + applyRowSpanUniforms).
export function applyPatternUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  u: PatternUniforms
): void {
  applyShapeUniforms(gl, locations, u);
  gl.uniform2f(locations['u_patternSize'], u.patternWidth, u.patternHeight);
}

export const PATTERN_LIB = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    ${ALPHA_TAG_LIB}

    ${SHAPE_FILL_LIB}

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
      // Only the indexed tag is supported; both transparent and true-color
      // tiles are skipped, same as patternColorAt's own ALPHA_INDEXED-only
      // check.
      if (!isIndexed(texel)) {
        discard;
      }
      return texel;
    }
    `;
