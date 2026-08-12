// Shared GLSL for the GPU Pattern fill, reusing the shape inside-tests in
// shapeFillShaderLib.ts. Both the commit path (PatternGeometricIndexer) and the
// preview path (OverlayPatternRenderer) embed PATTERN_LIB.
//
// The returned texel is still tagged (patternTexel discards only transparent
// tiles), so each consumer decides what an indexed and a true-color tile mean
// for it.
//
// Tiling anchors to the canvas origin via mod(pix, u_patternSize), so
// separately-filled shapes show one continuous pattern — and must stay
// pixel-identical with patternColorAt (algorithm/patternFill.ts). NEAREST
// filtering, and mod() rather than gl.REPEAT so the texture's wrap mode is not
// shared with the unrelated brush-stamp code.

import { PatternUniforms } from '../../algorithm/patternFill';
import { ALPHA_TAG_LIB } from './alphaTagShaderLib';
import { applyShapeUniforms, SHAPE_FILL_LIB, SHAPE_FILL_UNIFORM_NAMES } from './shapeFillShaderLib';

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
      // Only a transparent tile is skipped. A true-color tile keeps its
      // literal RGB and is written through as a true-color pixel by the
      // caller — the same pass-through stamping a true-color brush does
      // (see patternColorAt, the CPU twin this stays identical with).
      if (isTransparent(texel)) {
        discard;
      }
      return texel;
    }
    `;
