import { GradientShape } from '../../../algorithm/gradientFill';
import { patternFillUniforms } from '../../../algorithm/patternFill';
import { BrushColorIndex } from '../../../domain/BrushColorIndex';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../../util/util';
import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import {
  applyPatternUniforms,
  PATTERN_LIB,
  PATTERN_UNIFORM_NAMES,
} from '../../util/patternShaderLib';
import { ALPHA_INDEXED } from '../../../domain/CanvasColorIndex';
import { GRADIENT_VERTEX_SHADER } from '../../util/gradientShaderLib';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';

// Writes a Pattern-filled convex shape (rect/circle/ellipse/polygon) into
// the color-index texture in ONE draw call — the Pattern-fill twin of
// GradientGeometricIndexer, tiling a captured brush bitmap instead of
// computing a band index. The pattern texture lives on its own dedicated
// unit (7 — every other unit in the codebase is already permanently
// claimed: 0/1/2 by the canvas/palette/brush-stamp textures, 3-6 by
// EffectIndexer's scratch textures, 8 by Gradient fill's row-span texture),
// re-uploaded only when the captured pattern actually changes
// (patternFillStore.version, PatternFill.ts). The row-span texture (see
// ROW_SPAN_TEXTURE_UNIT) is this class's own second texture, on unit 9.
const PATTERN_TEXTURE_UNIT = 7;
const ROW_SPAN_TEXTURE_UNIT = 9;

export class PatternGeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };
  private texture: WebGLTexture | null = null;
  private currentPatternVersion = -1;
  private rowSpanTexture: RowSpanTexture;

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of PATTERN_UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    // the pattern/row-span textures are always in their own fixed unit, so
    // the sampler uniforms can be set once
    gl.uniform1i(this.uniforms['u_pattern'], PATTERN_TEXTURE_UNIT);
    gl.uniform1i(this.uniforms['u_rowSpans'], ROW_SPAN_TEXTURE_UNIT);
    this.rowSpanTexture = new RowSpanTexture(gl, ROW_SPAN_TEXTURE_UNIT);
  }

  public indexPatternFill(shape: GradientShape, pattern: BrushColorIndex, version: number): void {
    const gl = this.gl;
    const u = patternFillUniforms(shape, pattern);

    activateProgram(gl, this.program);
    bindFramebuffer(gl, this.targetFrameBuffer);

    if (this.currentPatternVersion !== version) {
      this.loadPatternAsTexture(pattern);
      this.currentPatternVersion = version;
    }
    // Re-bind every draw (cheap — 2 calls), not just when the pattern
    // version changes: keeps this correct regardless of what else might
    // touch texture unit 7 between draw calls, without relying on nothing
    // else ever doing so.
    gl.activeTexture(gl.TEXTURE0 + PATTERN_TEXTURE_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.rowSpanTexture.use(shape)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }

    applyPatternUniforms(gl, this.uniforms, u);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    // pixel n covers canvas coordinates [n, n+1) — same convention as
    // GradientGeometricIndexer's quad
    const xLeft = canvasToWebGLCoordX(gl, u.left);
    const xRight = canvasToWebGLCoordX(gl, u.right + 1);
    const yTop = canvasToWebGLCoordY(gl, u.top);
    const yBottom = canvasToWebGLCoordY(gl, u.bottom + 1);

    const vertices = new Float32Array([xLeft, yTop, xLeft, yBottom, xRight, yTop, xRight, yBottom]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private loadPatternAsTexture(pattern: BrushColorIndex): void {
    const gl = this.gl;

    gl.activeTexture(gl.TEXTURE0 + PATTERN_TEXTURE_UNIT);

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

    // Wrap mode doesn't matter here — PATTERN_LIB's mod() keeps the
    // sampled uv inside [0, 1) itself, deliberately not relying on
    // gl.REPEAT (see this file's header comment). CLAMP_TO_EDGE is used
    // anyway, matching every other texture in the codebase.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${PATTERN_LIB}

    void main () {
      vec4 texel = patternTexel();
      // packed indexed pixel, same format as GeometricIndexer's u_pixel:
      // storage index in R, ALPHA_INDEXED tag in A (docs/true-color-mode.md)
      gl_FragColor = vec4(texel.r, 0.0, 0.0, ${ALPHA_INDEXED}.0 / 255.0);
    }
    `;

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (PatternGeometricIndexer)');
    return program;
  }

  public dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    this.rowSpanTexture.dispose();
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
