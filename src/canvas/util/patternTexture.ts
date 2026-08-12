import { BrushColorIndex } from '../../domain/BrushColorIndex';

// The captured Pattern-fill bitmap as a GL texture, uploaded only when the
// capture actually changes. One instance per fill renderer (commit and preview
// are different WebGL contexts (paintingCanvas vs overlayCanvas), and can't
// share a texture object), same ownership model as RowSpanTexture next door.
export class PatternTexture {
  private gl: WebGLRenderingContext;
  private textureUnit: number;
  private texture: WebGLTexture | null = null;
  private currentVersion = -1;

  public constructor(gl: WebGLRenderingContext, textureUnit: number) {
    this.gl = gl;
    this.textureUnit = textureUnit;
  }

  // Binds the pattern to this instance's texture unit, re-uploading only when
  // `version` (patternFillStore.version, PatternFill.ts) shows the capture
  // changed: the same cache-by-version pattern DrawImageIndexer uses for
  // CustomBrush.lastChanged.
  //
  // The bind happens on every call, not just on upload (cheap. 2 calls): it
  // keeps the renderer correct regardless of what else might touch this texture
  // unit between draw calls, without relying on nothing else ever doing so.
  public use(pattern: BrushColorIndex, version: number): void {
    const gl = this.gl;
    if (this.currentVersion !== version) {
      this.upload(pattern);
      this.currentVersion = version;
      return; // upload leaves the texture bound to this unit already
    }
    gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  private upload(pattern: BrushColorIndex): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
    if (!this.texture) {
      this.texture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      pattern.width,
      pattern.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pattern.indexArray
    );

    // Wrap mode doesn't matter here. PATTERN_LIB's mod() keeps the sampled uv
    // inside [0, 1) itself, deliberately not relying on gl.REPEAT (see
    // patternShaderLib.ts's header). CLAMP_TO_EDGE is used anyway, matching
    // every other texture in the codebase. NEAREST is required, not just
    // conventional: filtering would blend across the alpha-tag boundary.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  public dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}
