// The overlay paints over the main canvas, which already shows the stencil's
// protected pixels, so a preview drawn there would cover them. Every overlay
// program drops its fragment where the stencil protects.
//
// The vertex half carries the fragment's position in the stencil texture's own
// coordinates; the fragment half needs ALPHA_TAG_LIB embedded before it.

export const STENCIL_UV_VERTEX_LIB = `
    varying vec2 v_stencilUv;
    `;

// Clip space (-1..1) to texture space, which is also what the stencil raster's
// bottom-up row order wants: no Y flip.
//
// From the attribute, not gl_Position: that is write-only in a vertex shader,
// and reading it back silently yields zero, which samples one texel for the
// whole draw.
export const STENCIL_UV_ASSIGN = `
      v_stencilUv = a_position.xy * 0.5 + 0.5;
    `;

export const STENCIL_DISCARD_LIB = `
    varying vec2 v_stencilUv;
    uniform sampler2D u_stencil;
    uniform float u_stencilOn;

    bool stencilBlocks() {
      return u_stencilOn > 0.5 && !isTransparent(texture2D(u_stencil, v_stencilUv));
    }
    `;
