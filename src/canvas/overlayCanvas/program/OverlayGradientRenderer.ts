import { GradientFillStyle, gradientFillUniforms } from '../../../algorithm/gradientFill';
import { FillShape } from '../../../algorithm/fillShape';
import { createProgram, activateProgram } from '../../util/webglUtil';
import {
  applyGradientUniforms,
  GRADIENT_LIB,
  GRADIENT_UNIFORM_NAMES,
} from '../../util/gradientShaderLib';
import { FILL_VERTEX_SHADER } from '../../util/shapeFillShaderLib';
import { drawShapeQuad } from '../../util/shapeFillDraw';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';
import { RowSpanTable } from '../../../algorithm/rowSpans';

// Mirrors GradientGeometricIndexer's own ROW_SPAN_TEXTURE_UNIT constant —
// see that file's comment. A separate context (this is the overlay canvas,
// not the painting canvas) so the unit number doesn't have to match, but
// keeping it identical avoids a second, arbitrary number to track.
const ROW_SPAN_TEXTURE_UNIT = 8;

// The live-preview twin of GradientGeometricIndexer: same shape/band/dither
// GLSL, but resolves the per-fragment index through the palette texture
// (unit 1, the texture CycleDriver re-uploads every cycling step) so the
// preview shows display colors and animates under Tab-cycling for free.
export class OverlayGradientRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };
  private rowSpanTexture: RowSpanTexture;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of [...GRADIENT_UNIFORM_NAMES, 'u_palette']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    gl.uniform1i(this.uniforms['u_rowSpans'], ROW_SPAN_TEXTURE_UNIT);
    this.rowSpanTexture = new RowSpanTexture(gl, ROW_SPAN_TEXTURE_UNIT);
  }

  // rowSpanTableOverride: see RowSpanTexture.use's own comment — the Fill
  // Style preview swatch's way of keeping Gradient/Pattern's preview
  // consistent with Solid's, both using symmetricFilledEllipse instead of
  // this shape's real row-span table.
  public renderGradientFill(
    shape: FillShape,
    style: GradientFillStyle,
    seed: number,
    rowSpanTableOverride?: RowSpanTable
  ): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);

    applyGradientUniforms(gl, this.uniforms, u);
    if (this.rowSpanTexture.use(shape, rowSpanTableOverride)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }
    gl.uniform1i(this.uniforms['u_palette'], 1); // palette texture unit

    drawShapeQuad(gl, this.a_position, u);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${GRADIENT_LIB}

    uniform sampler2D u_palette;

    void main () {
      float index = gradientStorageIndex();
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, FILL_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (OverlayGradientRenderer)');
    return program;
  }

  public dispose(): void {
    this.rowSpanTexture.dispose();
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
