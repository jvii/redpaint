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
//  * All uniforms are floats/vec2 except the two mode selectors (int).
//  * Polygon (shapeKind 3) is the one shape whose vertices are already in
//    ABSOLUTE canvas coordinates (SymmetryBrush resolves rotation/mirroring
//    per copy on the CPU before this ever runs — see MAX_VERTICES below),
//    so its point-in-polygon test compares against pix directly, not
//    against the center-relative `local` the other shapes use. The dither
//    hash still reads `local` for polygon too, keeping its input bounded by
//    the shape's own size regardless of where on the canvas it's drawn.

import { GradientUniforms, MAX_GRADIENT_POLYGON_VERTICES } from '../../algorithm/gradientFill';

// Shared by both GradientGeometricIndexer and OverlayGradientRenderer:
// every uniform GRADIENT_LIB declares except u_palette (the overlay-only
// sampler). Look these up once per program via getUniformLocation.
export const GRADIENT_UNIFORM_NAMES = [
  'u_canvasHeight',
  'u_shapeKind',
  'u_center',
  'u_radius',
  'u_rotation',
  'u_axisMode',
  'u_axisMin',
  'u_axisSpan',
  'u_bandCount',
  'u_rangeLowIndex',
  'u_ditherJitter',
  'u_seed',
  'u_vertices',
  'u_nextVertices',
  'u_vertexCount',
];

// Sets every GRADIENT_LIB uniform from one GradientUniforms value — the
// part of indexGradientFill/renderGradientFill that's identical between
// the commit and preview path. u_vertices/u_nextVertices are padded to the
// shader's fixed array size (unused slots are never read: the shader loop
// breaks at u_vertexCount) and gl.uniform2fv sets a whole array in one call.
//
// u_nextVertices[i] duplicates u_vertices[(i+1) % count] — computed here on
// the CPU, not in the shader. WebGL1 fragment shaders only allow the bare
// loop-control variable as a dynamic array index (ANGLE rejects anything
// derived from it, e.g. a `j = i==0 ? count-1 : i-1` previous-vertex index,
// with "Index expression can only contain const or loop symbols"), so the
// shader can't compute "the previous/next vertex" itself — every edge
// (u_vertices[i], u_nextVertices[i]) is looked up with the same bare `i`
// instead, at the cost of this second array.
export function applyGradientUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  u: GradientUniforms
): void {
  gl.uniform1f(locations['u_canvasHeight'], gl.drawingBufferHeight);
  gl.uniform1i(locations['u_shapeKind'], u.shapeKind);
  gl.uniform2f(locations['u_center'], u.center.x, u.center.y);
  gl.uniform2f(locations['u_radius'], u.radiusX, u.radiusY);
  gl.uniform1f(locations['u_rotation'], u.rotation);
  gl.uniform1i(locations['u_axisMode'], u.axisMode);
  gl.uniform1f(locations['u_axisMin'], u.axisMin);
  gl.uniform1f(locations['u_axisSpan'], u.axisSpan);
  gl.uniform1f(locations['u_bandCount'], u.bandCount);
  gl.uniform1f(locations['u_rangeLowIndex'], u.rangeLowIndex);
  gl.uniform1f(locations['u_ditherJitter'], u.ditherJitter);
  gl.uniform1f(locations['u_seed'], u.seed);

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

export const GRADIENT_VERTEX_SHADER = `
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
    }
    `;

export const GRADIENT_LIB = `
    precision mediump float;

    uniform float u_canvasHeight; // drawing buffer height in pixels
    uniform int u_shapeKind;      // 0 = rect, 1 = circle, 2 = ellipse, 3 = polygon
    uniform vec2 u_center;        // shape center, canvas coords (y down)
    uniform vec2 u_radius;        // (rx, ry); circle: (r, r); unused for polygon
    uniform float u_rotation;     // ellipse rotation in radians, else 0.0
    uniform int u_axisMode;       // 0 = vertical, 1 = horizontal, 2 = horizontalLine
    uniform float u_axisMin;      // band-0 axis position (modes 0/1; rect rows in mode 2)
    uniform float u_axisSpan;     // axis extent, max - min
    uniform float u_bandCount;    // rangeHigh - rangeLow, >= 1.0
    uniform float u_rangeLowIndex;// 0-based storage index of the range start
    uniform float u_ditherJitter; // dither * jitterPercent / 100; 0.0 = off
    uniform float u_seed;         // per-stroke dither seed
    uniform vec2 u_vertices[${MAX_GRADIENT_POLYGON_VERTICES}]; // polygon only, absolute canvas coords
    uniform vec2 u_nextVertices[${MAX_GRADIENT_POLYGON_VERTICES}]; // u_vertices[(i+1) % count], precomputed on the CPU
    uniform float u_vertexCount;  // polygon only, <= ${MAX_GRADIENT_POLYGON_VERTICES}.0

    // Even-odd point-in-polygon test (the same rule and edge-crossing math
    // as shape.ts's filledPolygon, ported to a fixed-size loop — WebGL1
    // requires a compile-time loop bound, so this runs the full
    // MAX_VERTICES range and breaks once i reaches u_vertexCount). For
    // horizontalLine mode also returns this fragment's own row *run*
    // bounds (runMin/runMax): a concave polygon's row can have more than
    // one disjoint run, so the fragment needs the specific pair of
    // crossings bracketing its own x, not the row's overall extent — found
    // in the same loop by tracking the nearest crossing on each side of
    // pix.x, no sorting needed.
    //
    // Every edge is read as (u_vertices[i], u_nextVertices[i]) — both
    // indexed by the bare loop variable i, never a derived index — because
    // WebGL1 fragment shaders only accept the loop-control variable itself
    // as a dynamic array index (ANGLE rejects anything derived from it,
    // e.g. a "previous vertex" index computed from i, with "Index
    // expression can only contain const or loop symbols"); u_nextVertices
    // exists purely to sidestep that restriction (see applyGradientUniforms).
    bool polygonRow(vec2 pix, out float runMin, out float runMax) {
      bool inside = false;
      runMin = -1.0e6;
      runMax = 1.0e6;
      for (int i = 0; i < ${MAX_GRADIENT_POLYGON_VERTICES}; i++) {
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

    // The fragment's canvas pixel: gl_FragCoord is window-space with y up
    // and pixel centers at +0.5; flip y and floor to integer pixel coords.
    vec2 canvasPixel() {
      return floor(vec2(gl_FragCoord.x, u_canvasHeight - gl_FragCoord.y));
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

      float c = cos(u_rotation);
      float s = sin(u_rotation);
      // ellipse-frame coords; identity when u_rotation is 0 (rect/circle)
      vec2 e = vec2(local.x * c + local.y * s, -local.x * s + local.y * c);

      if (u_shapeKind != 0) {
        vec2 n = e / u_radius;
        if (dot(n, n) > 1.0) {
          discard;
        }
      }

      if (u_axisMode == 0) {
        pos = pix.y; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_axisMode == 1) {
        pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_shapeKind == 0) {
        // horizontalLine on a rect: every row spans the full width
        pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_shapeKind == 1) {
        // horizontalLine on a circle: this row's single run, closed form
        float halfChord = sqrt(max(u_radius.x * u_radius.x - local.y * local.y, 0.0));
        pos = pix.x; minPos = u_center.x - halfChord; span = 2.0 * halfChord;
      } else {
        // horizontalLine on a rotated ellipse: for a fixed canvas row
        // (local.y), the implicit equation
        //   ((x c + y s) / rx)^2 + ((-x s + y c) / ry)^2 = 1
        // is a quadratic A x^2 + B x + C = 0 in local x; its two roots are
        // the run's ends. disc is clamped at 0 (rows grazing the edge).
        float rx2 = u_radius.x * u_radius.x;
        float ry2 = u_radius.y * u_radius.y;
        float A = (c * c) / rx2 + (s * s) / ry2;
        float B = 2.0 * local.y * c * s * (1.0 / rx2 - 1.0 / ry2);
        float C = local.y * local.y * ((s * s) / rx2 + (c * c) / ry2) - 1.0;
        float root = sqrt(max(B * B - 4.0 * A * C, 0.0));
        float x0 = (-B - root) / (2.0 * A);
        float x1 = (-B + root) / (2.0 * A);
        pos = pix.x; minPos = u_center.x + x0; span = x1 - x0;
      }

      return u_rangeLowIndex + gradientBand(pos, minPos, span, local);
    }
    `;
