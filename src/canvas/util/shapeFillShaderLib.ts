// Shape inside-tests shared by the GPU fill shaders that need "is this
// fragment inside the shape, and where is it" — Gradient (gradientShaderLib.ts,
// which layers axis/band math on top) and Pattern (patternShaderLib.ts,
// which just tiles from here). Single source of truth for the rotated-
// ellipse and bounded-loop polygon math, so a fix to either doesn't need to
// be repeated in two places.
//
// Declares u_canvasHeight and the polygon uniforms (u_vertices/
// u_nextVertices/u_vertexCount) itself — every consumer's own GLSL must NOT
// redeclare these (a duplicate `uniform` declaration is a GLSL compile
// error) but does still need to list their names in its own uniform-location
// lookup (see GRADIENT_UNIFORM_NAMES / PATTERN_UNIFORM_NAMES) since
// applyGradientUniforms/applyPatternUniforms still set them by name.
// u_shapeKind/u_center/u_radius/u_rotation stay out of this file: they're
// read directly by each consumer's own top-level function, not by anything
// declared here, so each consumer keeps declaring them itself.

import { MAX_GRADIENT_POLYGON_VERTICES } from '../../algorithm/gradientFill';

export const SHAPE_FILL_LIB = `
    uniform float u_canvasHeight; // drawing buffer height in pixels
    uniform vec2 u_vertices[${MAX_GRADIENT_POLYGON_VERTICES}]; // polygon only, absolute canvas coords
    uniform vec2 u_nextVertices[${MAX_GRADIENT_POLYGON_VERTICES}]; // u_vertices[(i+1) % count], precomputed on the CPU
    uniform float u_vertexCount;  // polygon only, <= ${MAX_GRADIENT_POLYGON_VERTICES}.0

    // Even-odd point-in-polygon test (the same rule and edge-crossing math
    // as shape.ts's filledPolygon, ported to a fixed-size loop — WebGL1
    // requires a compile-time loop bound, so this runs the full
    // MAX_VERTICES range and breaks once i reaches u_vertexCount). Also
    // returns this fragment's own row *run* bounds (runMin/runMax): a
    // concave polygon's row can have more than one disjoint run, so a
    // horizontalLine gradient needs the specific pair of crossings
    // bracketing its own x, not the row's overall extent — found in the
    // same loop by tracking the nearest crossing on each side of pix.x, no
    // sorting needed. Callers that don't need them (Pattern) just ignore
    // the out-params.
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

    // The fragment's canvas pixel: gl_FragCoord is window-space with y up
    // and pixel centers at +0.5; flip y and floor to integer pixel coords.
    vec2 canvasPixel() {
      return floor(vec2(gl_FragCoord.x, u_canvasHeight - gl_FragCoord.y));
    }

    // Whether local (a shape-center-relative position) lies inside a
    // (possibly rotated) ellipse of half-axes radius — a circle is the
    // radius.x == radius.y case. rotation in radians (0 for an unrotated
    // ellipse/circle). Callers with an unrotated shape can pass 0.0 and skip
    // computing cos/sin themselves — rotating by 0 is the identity.
    bool ellipseInside(vec2 local, vec2 radius, float rotation) {
      float c = cos(rotation);
      float s = sin(rotation);
      vec2 e = vec2(local.x * c + local.y * s, -local.x * s + local.y * c);
      vec2 n = e / radius;
      return dot(n, n) <= 1.0;
    }
    `;
