import { FillShape } from '../../../algorithm/fillShape';
import { patternFillUniforms } from '../../../algorithm/patternFill';
import { BrushColorIndex } from '../../../domain/BrushColorIndex';
import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import {
  applyPatternUniforms,
  PATTERN_LIB,
  PATTERN_UNIFORM_NAMES,
} from '../../util/patternShaderLib';
import { FILL_VERTEX_SHADER } from '../../util/shapeFillShaderLib';
import { drawShapeQuad } from '../../util/shapeFillDraw';
import { PatternTexture } from '../../util/patternTexture';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';

// Writes a Pattern-filled convex shape (rect/circle/ellipse/polygon) into the
// color-index texture in ONE draw call: the Pattern-fill twin of
// GradientGeometricIndexer, tiling a captured brush bitmap instead of computing
// a band index. The pattern texture lives on its own dedicated unit (7; every
// other unit in the codebase is already permanently claimed: 0/1/2 by the
// canvas/palette/brush-stamp textures, 3-6 by EffectIndexer's scratch textures,
// 8 by Gradient fill's row-span texture), re-uploaded only when the captured
// pattern actually changes (patternFillStore.version, PatternFill.ts). The
// row-span texture (see ROW_SPAN_TEXTURE_UNIT) is this class's own second
// texture, on unit 9.
const PATTERN_TEXTURE_UNIT = 7;
const ROW_SPAN_TEXTURE_UNIT = 9;

export class PatternGeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };
  private patternTexture: PatternTexture;
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
    // the pattern/row-span textures are always in their own fixed unit, so the
    // sampler uniforms can be set once
    gl.uniform1i(this.uniforms['u_pattern'], PATTERN_TEXTURE_UNIT);
    gl.uniform1i(this.uniforms['u_rowSpans'], ROW_SPAN_TEXTURE_UNIT);
    this.patternTexture = new PatternTexture(gl, PATTERN_TEXTURE_UNIT);
    this.rowSpanTexture = new RowSpanTexture(gl, ROW_SPAN_TEXTURE_UNIT);
  }

  public indexPatternFill(shape: FillShape, pattern: BrushColorIndex, version: number): void {
    const gl = this.gl;
    const u = patternFillUniforms(shape, pattern);

    activateProgram(gl, this.program);
    bindFramebuffer(gl, this.targetFrameBuffer);

    this.patternTexture.use(pattern, version);
    if (this.rowSpanTexture.use(shape)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }

    applyPatternUniforms(gl, this.uniforms, u);

    drawShapeQuad(gl, this.a_position, u);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${PATTERN_LIB}

    void main () {
      vec4 texel = patternTexel();
      if (isTrueColor(texel)) {
        // a true-color tile paints its literal RGB, tag and all. Exactly what
        // stamping the same brush directly would write
        gl_FragColor = vec4(texel.rgb, 1.0);
        return;
      }
      // packed indexed pixel, same format as GeometricIndexer's u_pixel:
      // storage index in R, ALPHA_INDEXED tag in A (docs/true-color-mode.md)
      gl_FragColor = vec4(texel.r, 0.0, 0.0, INDEXED_ALPHA);
    }
    `;

    const program = createProgram(this.gl, FILL_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (PatternGeometricIndexer)');
    return program;
  }

  public dispose(): void {
    this.patternTexture.dispose();
    this.rowSpanTexture.dispose();
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
