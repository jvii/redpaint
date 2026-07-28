// Shared GLSL for the GPU gradient fill (design:
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md). Both the commit
// path (GradientGeometricIndexer) and the preview path
// (OverlayGradientRenderer) embed GRADIENT_LIB and differ only in what they
// do with the returned palette index. Mirrors the effectShaderLib.ts
// pattern.
//
// Conventions, documented once here:
//  * gradientHash returns 0..1; its input is a LOCAL (shape-relative)
//    position plus the per-stroke seed. Local coords are bounded by the
//    shape size, not the canvas — every symmetry copy of a stroke shares
//    local coords and seed, so all copies get identical (translated)
//    speckle. The hash itself applies fract() before any large
//    multiplication (see gradientHash) rather than the classic
//    fract(sin(dot(p, BIG))*BIG) trick, which amplifies p into a huge
//    sin() argument that mediump can't represent precisely — visible as
//    diagonal banding for large shapes on GPUs that actually truncate
//    mediump to ~16 bits.
//  * The band math is a direct port of colorIdForPosition
//    (src/algorithm/gradientFill.ts): floor-divided bands over an extent
//    span (max - min), signed uniform jitter of half-width
//    u_ditherJitter * pointsPerColor, clamped to [0, u_bandCount].
//  * span <= 0.0 (a one-pixel row/column) resolves to band 0 = u_rangeLowIndex,
//    matching the CPU path's `span <= 0` guard.
//  * All uniforms are floats/vec2 except the shape/axis mode selectors (int).
//  * Polygon (shapeKind 3) is the one shape whose vertices are already in
//    ABSOLUTE canvas coordinates (SymmetryBrush resolves rotation/mirroring
//    per copy on the CPU before this ever runs — see MAX_VERTICES below),
//    so its point-in-polygon test compares against pix directly, not
//    against the center-relative `local` the other shapes use. The dither
//    hash still reads `local` for polygon too, keeping its input bounded by
//    the shape's own size regardless of where on the canvas it's drawn.
//  * Circle/ellipse (shapeKind 1/2) membership and per-row bounds come from
//    a row-span texture (rowSpanTexture.ts), not a continuous ellipse-
//    equation test: see rowSpanInside's own comment for why. Both shape
//    kinds share one code path — the row-span table already has any
//    rotation baked in, so there's nothing left that distinguishes them at
//    this point.

import { GradientUniforms } from '../../algorithm/gradientFill';
import {
  applyShapeUniforms,
  SHAPE_FILL_LIB,
  SHAPE_FILL_UNIFORM_NAMES,
} from './shapeFillShaderLib';

// Shared by both GradientGeometricIndexer and OverlayGradientRenderer:
// every uniform GRADIENT_LIB declares (the shape-describing ones via
// SHAPE_FILL_UNIFORM_NAMES) except u_palette (the overlay-only
// sampler) and u_rowSpans (a texture unit number each caller binds once at
// program-construction time, like PATTERN_LIB's u_pattern — its location is
// still looked up here since applyGradientUniforms doesn't set it).
export const GRADIENT_UNIFORM_NAMES = [
  ...SHAPE_FILL_UNIFORM_NAMES,
  'u_axisMode',
  'u_axisMin',
  'u_axisSpan',
  'u_bandCount',
  'u_rangeLowIndex',
  'u_ditherJitter',
  'u_seed',
  'u_rowSpans',
  'u_rowSpanYMin',
  'u_rowSpanRowCount',
];

// Sets every GRADIENT_LIB uniform from one GradientUniforms value: the
// shape-describing ones via applyShapeUniforms, then Gradient's own band/
// dither parameters. Not set here: u_rowSpans (a texture unit number each
// caller binds once at program-construction time) and u_rowSpanYMin/
// u_rowSpanRowCount (bound alongside the texture itself by
// RowSpanTexture.use + applyRowSpanUniforms, right before this runs).
export function applyGradientUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  u: GradientUniforms
): void {
  applyShapeUniforms(gl, locations, u);
  gl.uniform1i(locations['u_axisMode'], u.axisMode);
  gl.uniform1f(locations['u_axisMin'], u.axisMin);
  gl.uniform1f(locations['u_axisSpan'], u.axisSpan);
  gl.uniform1f(locations['u_bandCount'], u.bandCount);
  gl.uniform1f(locations['u_rangeLowIndex'], u.rangeLowIndex);
  gl.uniform1f(locations['u_ditherJitter'], u.ditherJitter);
  gl.uniform1f(locations['u_seed'], u.seed);
}

export const GRADIENT_LIB = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    ${SHAPE_FILL_LIB}

    uniform int u_axisMode;       // 0 = vertical, 1 = horizontal, 2 = horizontalLine
    uniform float u_axisMin;      // band-0 axis position (modes 0/1; rect rows in mode 2)
    uniform float u_axisSpan;     // axis extent, max - min
    uniform float u_bandCount;    // rangeHigh - rangeLow, >= 1.0
    uniform float u_rangeLowIndex;// 0-based storage index of the range start
    uniform float u_ditherJitter; // dither * jitterPercent / 100; 0.0 = off
    uniform float u_seed;         // per-stroke dither seed

    // Small-coefficient, fract-early hash (the "hash21" pattern used widely
    // in shader code): every intermediate value stays near [0, 1) instead
    // of blowing up in magnitude before the final fract(), which is what
    // made the classic fract(sin(dot(...))*43758.5453) trick unsafe here —
    // p can be a few hundred pixels from the shape center, and the seed
    // adds more on top, easily pushing that trick's sin() argument into the
    // tens of thousands where mediump has no precision left.
    float gradientHash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx + u_seed) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float gradientBand(float pos, float minPos, float span, vec2 hashPos) {
      if (span <= 0.0) {
        return 0.0;
      }
      float pointsPerColor = span / (u_bandCount + 1.0);
      float jitter = 0.0;
      float halfWidth = u_ditherJitter * pointsPerColor;
      if (halfWidth > 0.0) {
        jitter = (gradientHash(hashPos) * 2.0 - 1.0) * halfWidth;
      }
      float idx = floor((pos - minPos + jitter) / pointsPerColor);
      return clamp(idx, 0.0, u_bandCount);
    }

    // 0-based palette storage index for this fragment. Discards fragments
    // outside the shape (rect never discards: its quad IS the shape).
    float gradientStorageIndex() {
      vec2 pix = canvasPixel();
      vec2 local = pix - u_center;

      float pos;
      float minPos;
      float span;

      // Polygon is a separate branch: its inside test is a bounded-loop
      // point-in-polygon check against ABSOLUTE vertex coordinates (not the
      // center-relative ellipse-frame math below), and horizontalLine needs
      // this fragment's own row run, not a closed-form chord.
      if (u_shapeKind == 3) {
        float runMin;
        float runMax;
        if (!polygonRow(pix, runMin, runMax)) {
          discard;
        }
        if (u_axisMode == 0) {
          pos = pix.y; minPos = u_axisMin; span = u_axisSpan;
        } else if (u_axisMode == 1) {
          pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
        } else {
          pos = pix.x; minPos = runMin; span = runMax - runMin;
        }
        return u_rangeLowIndex + gradientBand(pos, minPos, span, local);
      }

      if (u_shapeKind == 1 || u_shapeKind == 2) {
        float rowXMin;
        float rowXMax;
        if (!rowSpanInside(local, rowXMin, rowXMax)) {
          discard;
        }
        if (u_axisMode == 0) {
          pos = pix.y; minPos = u_axisMin; span = u_axisSpan;
        } else if (u_axisMode == 1) {
          pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
        } else {
          // horizontalLine: this row's own exact span from the table
          // itself, not a closed-form chord — exact for rotated ellipses
          // too, since rotation is already baked into the table.
          pos = pix.x; minPos = u_center.x + rowXMin; span = rowXMax - rowXMin;
        }
        return u_rangeLowIndex + gradientBand(pos, minPos, span, local);
      }

      // u_shapeKind == 0 (rect): the quad IS the shape, no inside test
      // needed. horizontalLine on a rect: every row spans the full width,
      // same as the other two axis modes.
      if (u_axisMode == 0) {
        pos = pix.y; minPos = u_axisMin; span = u_axisSpan;
      } else {
        pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
      }
      return u_rangeLowIndex + gradientBand(pos, minPos, span, local);
    }
    `;
