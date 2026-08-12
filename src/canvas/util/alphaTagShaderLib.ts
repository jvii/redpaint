import {
  ALPHA_INDEXED,
  ALPHA_TRANSPARENT,
  ALPHA_TRUECOLOR,
} from '../../domain/CanvasColorIndex';

// The pixel-format tag test, for shaders.
//
// Every pixel in the color-index texture carries its kind in the alpha channel
// (docs/true-color-mode.md): ALPHA_TRANSPARENT / ALPHA_INDEXED /
// ALPHA_TRUECOLOR. The thresholds below are the midpoints between those values,
// computed from the constants themselves — a sampled tag lands exactly on a tag
// value, so anything short of a midpoint is unambiguous. Hand-written
// thresholds would mean changing ALPHA_INDEXED moved every TypeScript check and
// no shader check.
//
// Embed once per fragment shader, after the precision declaration and before
// any lib that uses it. A duplicate embed is a GLSL redefinition error.
const TRANSPARENT_MAX = (ALPHA_TRANSPARENT + ALPHA_INDEXED) / 2 / 255;
const INDEXED_MAX = (ALPHA_INDEXED + ALPHA_TRUECOLOR) / 2 / 255;

export const ALPHA_TAG_LIB = `
    // the alpha value an indexed pixel is written with
    const float INDEXED_ALPHA = ${ALPHA_INDEXED}.0 / 255.0;

    bool isTransparent(vec4 p) {
      return p.a < ${TRANSPARENT_MAX};
    }

    bool isIndexed(vec4 p) {
      return p.a >= ${TRANSPARENT_MAX} && p.a < ${INDEXED_MAX};
    }

    bool isTrueColor(vec4 p) {
      return p.a >= ${INDEXED_MAX};
    }
    `;
