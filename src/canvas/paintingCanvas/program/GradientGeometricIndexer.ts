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
import { ALPHA_INDEXED } from '../../../domain/CanvasColorIndex';

// Writes a gradient-filled convex shape (rect/circle/ellipse) into the
// color-index texture in ONE draw call: the fragment shader classifies each
// pixel into its color band (with per-stroke seeded dither) and writes the
// packed indexed pixel directly — the per-fragment version of what
// GeometricIndexer's u_pixel does per draw call. See
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md.
export class GradientGeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of GRADIENT_UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  public indexGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    applyGradientUniforms(gl, this.uniforms, u);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    // pixel n covers canvas coordinates [n, n+1), so the quad extends to the
    // far edge of the greater pixel (same convention as indexQuad)
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

    void main () {
      float index = gradientStorageIndex();
      // packed indexed pixel, same format as GeometricIndexer's u_pixel:
      // storage index in R, ALPHA_INDEXED tag in A (docs/true-color-mode.md)
      gl_FragColor = vec4(index / 255.0, 0.0, 0.0, ${ALPHA_INDEXED}.0 / 255.0);
    }
    `;

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (GradientGeometricIndexer)');
    return program;
  }

  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
