import {
  GradientFillStyle,
  GradientShape,
  gradientFillUniforms,
} from '../../../algorithm/gradientFill';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import {
  applyGradientUniforms,
  GRADIENT_LIB,
  GRADIENT_UNIFORM_NAMES,
  GRADIENT_VERTEX_SHADER,
} from '../../util/gradientShaderLib';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';

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

  public renderGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);

    applyGradientUniforms(gl, this.uniforms, u);
    if (this.rowSpanTexture.use(shape)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }
    gl.uniform1i(this.uniforms['u_palette'], 1); // palette texture unit

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const xLeft = canvasToWebGLCoordX(gl, u.left);
    const xRight = canvasToWebGLCoordX(gl, u.right + 1);
    const yTop = canvasToWebGLCoordY(gl, u.top);
    const yBottom = canvasToWebGLCoordY(gl, u.bottom + 1);

    const vertices = new Float32Array([xLeft, yTop, xLeft, yBottom, xRight, yTop, xRight, yBottom]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
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
