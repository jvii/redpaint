import { FillShape } from '../../../algorithm/fillShape';
import { patternFillUniforms } from '../../../algorithm/patternFill';
import { BrushColorIndex } from '../../../domain/BrushColorIndex';
import { createProgram, activateProgram } from '../../util/webglUtil';
import {
  applyPatternUniforms,
  PATTERN_LIB,
  PATTERN_UNIFORM_NAMES,
} from '../../util/patternShaderLib';
import { FILL_VERTEX_SHADER } from '../../util/shapeFillShaderLib';
import { drawShapeQuad } from '../../util/shapeFillDraw';
import { PatternTexture } from '../../util/patternTexture';
import { applyRowSpanUniforms, RowSpanTexture } from '../../util/rowSpanTexture';
import { RowSpanTable } from '../../../algorithm/rowSpans';

// The pattern/row-span textures' own dedicated units. The overlay canvas has
// its own GL context, so these do not collide with PatternGeometricIndexer's
// identically-numbered units in the painting canvas's; matching numbers across
// the two contexts is the convention here.
const PATTERN_TEXTURE_UNIT = 7;
const ROW_SPAN_TEXTURE_UNIT = 9;

// The live-preview twin of PatternGeometricIndexer: same shape/tiling GLSL, but
// resolves the fetched texel's storage index through the palette texture (unit
// 1, the texture CycleDriver re-uploads every cycling step) so the preview
// shows display colors and animates under Tab-cycling for free, same trick
// OverlayGradientRenderer uses for gradient previews.
export class OverlayPatternRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };
  private patternTexture: PatternTexture;
  private rowSpanTexture: RowSpanTexture;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of [...PATTERN_UNIFORM_NAMES, 'u_palette']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    gl.uniform1i(this.uniforms['u_pattern'], PATTERN_TEXTURE_UNIT);
    gl.uniform1i(this.uniforms['u_rowSpans'], ROW_SPAN_TEXTURE_UNIT);
    this.patternTexture = new PatternTexture(gl, PATTERN_TEXTURE_UNIT);
    this.rowSpanTexture = new RowSpanTexture(gl, ROW_SPAN_TEXTURE_UNIT);
  }

  // rowSpanTableOverride: see RowSpanTexture.use's own comment, the Fill Style
  // preview swatch's way of keeping Gradient/Pattern's preview consistent with
  // Solid's, both using symmetricFilledEllipse instead of this shape's real
  // row-span table.
  public renderPatternFill(
    shape: FillShape,
    pattern: BrushColorIndex,
    version: number,
    rowSpanTableOverride?: RowSpanTable
  ): void {
    const gl = this.gl;
    const u = patternFillUniforms(shape, pattern);

    activateProgram(gl, this.program);

    this.patternTexture.use(pattern, version);
    if (this.rowSpanTexture.use(shape, rowSpanTableOverride)) {
      applyRowSpanUniforms(gl, this.uniforms, this.rowSpanTexture);
    }

    applyPatternUniforms(gl, this.uniforms, u);
    gl.uniform1i(this.uniforms['u_palette'], 1); // palette texture unit

    drawShapeQuad(gl, this.a_position, u);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${PATTERN_LIB}

    uniform sampler2D u_palette;

    void main () {
      vec4 texel = patternTexel();
      if (isTrueColor(texel)) {
        gl_FragColor = vec4(texel.rgb, 1.0); // literal color, no palette hop
        return;
      }
      gl_FragColor = texture2D(u_palette, vec2((texel.r * 255.0 + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, FILL_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (OverlayPatternRenderer)');
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
