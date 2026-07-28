import { GradientShape } from '../../../algorithm/gradientFill';
import { patternFillUniforms } from '../../../algorithm/patternFill';
import { BrushColorIndex } from '../../../domain/BrushColorIndex';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import {
  applyPatternUniforms,
  PATTERN_LIB,
  PATTERN_UNIFORM_NAMES,
} from '../../util/patternShaderLib';
import { GRADIENT_VERTEX_SHADER } from '../../util/gradientShaderLib';

// The pattern texture's own dedicated unit — this renderer lives in the
// overlay canvas's own separate GL context, so this doesn't collide with
// PatternGeometricIndexer's identically-numbered unit in the painting
// canvas's context (the two are independent GPU resource namespaces); using
// the same number for both is just the established convention (mirrors
// DrawImageIndexer/OverlayDrawImageRenderer both using unit 2 for the
// brush-stamp texture, each in its own context).
const PATTERN_TEXTURE_UNIT = 7;

// The live-preview twin of PatternGeometricIndexer: same shape/tiling GLSL,
// but resolves the fetched texel's storage index through the palette
// texture (unit 1, the texture CycleDriver re-uploads every cycling step)
// so the preview shows display colors and animates under Tab-cycling for
// free — same trick OverlayGradientRenderer uses for gradient previews.
export class OverlayPatternRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };
  private texture: WebGLTexture | null = null;
  private currentPatternVersion = -1;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of [...PATTERN_UNIFORM_NAMES, 'u_palette']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    gl.uniform1i(this.uniforms['u_pattern'], PATTERN_TEXTURE_UNIT);
  }

  public renderPatternFill(shape: GradientShape, pattern: BrushColorIndex, version: number): void {
    const gl = this.gl;
    const u = patternFillUniforms(shape, pattern);

    activateProgram(gl, this.program);

    if (this.currentPatternVersion !== version) {
      this.loadPatternAsTexture(pattern);
      this.currentPatternVersion = version;
    }
    // Re-bind every draw (cheap — 2 calls), not just when the pattern
    // version changes — see PatternGeometricIndexer's identical comment.
    gl.activeTexture(gl.TEXTURE0 + PATTERN_TEXTURE_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    applyPatternUniforms(gl, this.uniforms, u);
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

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${PATTERN_LIB}

    uniform sampler2D u_palette;

    void main () {
      vec4 texel = patternTexel();
      gl_FragColor = texture2D(u_palette, vec2((texel.r * 255.0 + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (OverlayPatternRenderer)');
    return program;
  }

  public dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
