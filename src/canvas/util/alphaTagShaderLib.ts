import {
  ALPHA_INDEXED,
  ALPHA_TRANSPARENT,
  ALPHA_TRUECOLOR,
} from '../../domain/CanvasColorIndex';

// The pixel-format tag test, for shaders.
//
// Every pixel in the color-index texture carries its kind in the alpha
// channel (docs/true-color-mode.md): ALPHA_TRANSPARENT / ALPHA_INDEXED /
// ALPHA_TRUECOLOR. TypeScript reads that tag through the named constants
// everywhere; the shaders used to compare against hand-written thresholds
// instead — `a > 0.9` for true-color, `a < 0.1` for transparent, and one
// `a < 0.4 || a > 0.6` window fitted around 127/255 — so the contract held
// in one language and was reimplemented from memory in the other. Changing
// ALPHA_INDEXED would have moved every TypeScript check and no shader check.
//
// The thresholds here are the midpoints between the three tag values,
// computed from the constants themselves: a sampled tag lands exactly on a
// tag value, so anything short of a midpoint is unambiguous.
//
// Embed once per fragment shader, after the precision declaration and before
// any lib that uses it (EFFECT_LIB and PATTERN_LIB both do). A duplicate
// embed is a GLSL redefinition error, same rule as SHAPE_FILL_LIB.
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
