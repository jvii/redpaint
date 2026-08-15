import { overmind } from '../..';
import { paletteTextureData } from '../../algorithm/cycle';

// The palette lookup texture both canvas stacks sample to turn a stored color
// index into a display color. Always texture unit 1, in both GL contexts.
// Shared here rather than written out in each controller's own init/update pair
// (four copies of the same upload, one of them on the per-frame cycling path)
// so the rotation composition can't drift between them.
export const PALETTE_TEXTURE_UNIT = 1;

// The texture each context's palette lives in. Held here rather than in the
// controllers because this module already owns the convention that there is one
// per context on a fixed unit, and because texImage2D writes to whatever is
// *bound*, not to a unit — so the upload below has to bind before it writes
// rather than trust that nothing since has touched the target.
const paletteTextures = new WeakMap<WebGLRenderingContext, WebGLTexture>();

// Uploads the current palette, with color cycling's rotation applied.
//
// Composes from the raw state fields rather than the displayPalette derived:
// this runs inside actions (undo, resize, every cycling tick), where Overmind
// deriveds read undefined.
//
// Silent when the context has no palette texture yet. The autosave restore
// reaches this before the canvas has been initialized — the startup sizing
// waits for the restore to settle, and init() is what creates the texture — so
// the call arrives with a context but nothing bound, and used to spend its
// texImage2D on an INVALID_OPERATION. Nothing is lost by skipping: whatever
// creates the texture next fills it from this same state.
export function uploadPaletteTexture(gl: WebGLRenderingContext): void {
  const texture = paletteTextures.get(gl);
  if (!texture) {
    return;
  }
  const { palette, ranges, cycleOffsets } = overmind.state.palette;
  gl.activeTexture(gl.TEXTURE0 + PALETTE_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    256,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    paletteTextureData(palette, ranges, cycleOffsets)
  );
}

// Creates the palette texture on its unit, sets the sampling parameters every
// texture in this codebase uses (NEAREST, no wrap; A palette lookup must never
// blend between two entries), and fills it. Called once per context at init;
// uploadPaletteTexture refreshes it afterward.
export function createPaletteTexture(gl: WebGLRenderingContext): WebGLTexture | null {
  gl.activeTexture(gl.TEXTURE0 + PALETTE_TEXTURE_UNIT);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (texture) {
    // before the upload below, which now looks itself up here. A restored
    // context hands back the same gl object, so this replaces the dead entry.
    paletteTextures.set(gl, texture);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  uploadPaletteTexture(gl);
  return texture;
}
