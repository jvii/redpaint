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
//    shape size, not the canvas, which is what keeps fract(sin(...)) safe
//    at mediump precision. Every symmetry copy of a stroke shares local
//    coords and seed, so all copies get identical (translated) speckle.
//  * The band math is a direct port of colorIdForPosition
//    (src/algorithm/gradientFill.ts): floor-divided bands over an extent
//    span (max - min), signed uniform jitter of half-width
//    u_ditherJitter * pointsPerColor, clamped to [0, u_bandCount].
//  * span <= 0.0 (a one-pixel row/column) resolves to band 0 = u_rangeLowIndex,
//    matching the CPU path's `span <= 0` guard.
//  * All uniforms are floats/vec2 except the two mode selectors (int).

export const GRADIENT_VERTEX_SHADER = `
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
    }
    `;

export const GRADIENT_LIB = `
    precision mediump float;

    uniform float u_canvasHeight; // drawing buffer height in pixels
    uniform int u_shapeKind;      // 0 = rect, 1 = circle, 2 = ellipse
    uniform vec2 u_center;        // shape center, canvas coords (y down)
    uniform vec2 u_radius;        // (rx, ry); circle: (r, r)
    uniform float u_rotation;     // ellipse rotation in radians, else 0.0
    uniform int u_axisMode;       // 0 = vertical, 1 = horizontal, 2 = horizontalLine
    uniform float u_axisMin;      // band-0 axis position (modes 0/1; rect rows in mode 2)
    uniform float u_axisSpan;     // axis extent, max - min
    uniform float u_bandCount;    // rangeHigh - rangeLow, >= 1.0
    uniform float u_rangeLowIndex;// 0-based storage index of the range start
    uniform float u_ditherJitter; // dither * jitterPercent / 100; 0.0 = off
    uniform float u_seed;         // per-stroke dither seed

    float gradientHash(vec2 p) {
      return fract(sin(dot(p + u_seed, vec2(12.9898, 78.233))) * 43758.5453);
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

      float pos;
      float minPos;
      float span;
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
