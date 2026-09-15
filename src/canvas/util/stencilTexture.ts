import { CanvasColorIndex } from '../../domain/CanvasColorIndex';

// The stencil raster both canvas stacks sample to leave protected pixels
// looking as they were (docs/stencil.md).
//
// Unit 10, which is past everything else either context binds: 0, 1 and 2 are
// the color index, the palette and the brush bitmap; 3 to 6 are EffectIndexer's
// work, save, mask and shape (and 3 again is OverlaySelectionIndicatorRenderer's
// copy of the main canvas); 7 to 9 are the pattern and row-span textures. A unit
// shared with any of them is bound to whatever drew last, which showed up as the
// preview being masked by the wrong texture, and as an effect mode painting the
// stencil's pixels into its own working copy.
//
// WebGL guarantees only 8 combined units, so this needs a machine with more.
// Every desktop GPU reports at least 16, and the pattern fills already assume 10.
export const STENCIL_TEXTURE_UNIT = 10;

// One per context, for the reason paletteTexture.ts keeps its own: texImage2D
// writes to whatever is bound, not to a unit.
const stencilTextures = new WeakMap<WebGLRenderingContext, WebGLTexture>();

export function uploadStencilTexture(gl: WebGLRenderingContext, stencil: CanvasColorIndex): void {
  const texture = stencilTextures.get(gl) ?? createStencilTexture(gl);
  if (!texture) {
    return;
  }
  gl.activeTexture(gl.TEXTURE0 + STENCIL_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    stencil.width,
    stencil.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    stencil.indexArray
  );
}

// A single transparent texel, so the sampler has something bound whenever no
// stencil exists. Sampling an incomplete texture is undefined, and the shader
// reads the stencil on every fragment whether or not one is active.
export function clearStencilTexture(gl: WebGLRenderingContext): void {
  const texture = stencilTextures.get(gl) ?? createStencilTexture(gl);
  if (!texture) {
    return;
  }
  gl.activeTexture(gl.TEXTURE0 + STENCIL_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
}

function createStencilTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  gl.activeTexture(gl.TEXTURE0 + STENCIL_TEXTURE_UNIT);
  const texture = gl.createTexture();
  if (!texture) {
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  stencilTextures.set(gl, texture);
  return texture;
}
