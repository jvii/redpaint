import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import { ALPHA_TAG_LIB } from '../../util/alphaTagShaderLib';
import { STENCIL_TEXTURE_UNIT } from '../../util/stencilTexture';

// Bakes the stencil into the color index texture: what the display shader does
// per frame, written into the stored pixels once, so the undo snapshot, a save
// and the autosave agree with the screen (docs/stencil.md).
//
// A framebuffer pass rather than reading the index back, repairing it on the
// CPU and uploading it again: the read is a GPU sync and ColorIndexer.setIndex
// builds a fresh texture on every call, and this runs at the end of every
// stroke.
export class StencilIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private a_position: number;

  private static readonly QUAD_POSITIONS = new Float32Array([
    1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
  ]);

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_stencil'), STENCIL_TEXTURE_UNIT);
  }

  public indexStencil(): void {
    const gl = this.gl;

    activateProgram(gl, this.program);
    bindFramebuffer(gl, this.targetFrameBuffer);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);
    gl.bufferData(gl.ARRAY_BUFFER, StencilIndexer.QUAD_POSITIONS, gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public dispose(): void {
    this.gl.deleteProgram(this.program);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = a_position;
      v_texcoord = a_position.xy * 0.5 + 0.5;
    }
    `;

    // discard rather than a blend: unprotected pixels must keep whatever the
    // stroke put there, and the framebuffer already holds it.
    const fragmentShader = `
    precision mediump float;
    ${ALPHA_TAG_LIB}

    varying vec2 v_texcoord;
    uniform sampler2D u_stencil;

    void main() {
      vec4 stencilPixel = texture2D(u_stencil, v_texcoord);
      if (isTransparent(stencilPixel)) {
        discard;
      }
      gl_FragColor = stencilPixel;
    }
    `;

    return createProgram(this.gl, vertexShader, fragmentShader);
  }
}
