import { GradientFillStyle, gradientFillUniforms } from '../../../algorithm/gradientFill';
import { FillShape } from '../../../algorithm/fillShape';
import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import {
  applyGradientUniforms,
  GRADIENT_LIB,
  GRADIENT_UNIFORM_NAMES,
} from '../../util/gradientShaderLib';
import { FILL_VERTEX_SHADER } from '../../util/shapeFillShaderLib';
import { drawShapeQuad } from '../../util/shapeFillDraw';
import { ALPHA_INDEXED } from '../../../domain/CanvasColorIndex';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';

// The row-span texture lives on its own dedicated unit (8; every other unit in
// the codebase is already permanently claimed: 0/1/2 by the
// canvas/palette/brush-stamp textures, 3-6 by EffectIndexer's scratch textures,
// 7 by Pattern fill's captured-bitmap texture).
const ROW_SPAN_TEXTURE_UNIT = 8;

// Writes a gradient-filled convex shape (rect/circle/ellipse) into the
// color-index texture in ONE draw call: the fragment shader classifies each
// pixel into its color band (with per-stroke seeded dither) and writes the
// packed indexed pixel directly. The per-fragment version of what
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
  private rowSpanTexture: RowSpanTexture;

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of GRADIENT_UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    // the row-span texture is always in ROW_SPAN_TEXTURE_UNIT, so the sampler
    // uniform can be set once (mirrors PatternGeometricIndexer's u_pattern)
    gl.uniform1i(this.uniforms['u_rowSpans'], ROW_SPAN_TEXTURE_UNIT);
    this.rowSpanTexture = new RowSpanTexture(gl, ROW_SPAN_TEXTURE_UNIT);
  }

  public indexGradientFill(shape: FillShape, style: GradientFillStyle, seed: number): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);
    bindFramebuffer(gl, this.targetFrameBuffer);

    applyGradientUniforms(gl, this.uniforms, u);
    if (this.rowSpanTexture.use(shape)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }

    drawShapeQuad(gl, this.a_position, u);
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

    const program = createProgram(this.gl, FILL_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (GradientGeometricIndexer)');
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
