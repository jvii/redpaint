import { createProgram, useProgram } from '../../util/webglUtil';

export class DrawImageRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
  }

  public renderCanvas(): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // use texture units 0 and 1 for the image and palette

    const imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.program, 'a_position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    const positions = [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    // count = positions.length / 2 = 6
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = a_position;

      // assuming a unit quad for position we can just use that for texcoords
      v_texcoord = a_position.xy * vec2(0.5, -0.5) + 0.5;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    varying vec2 v_texcoord;
    uniform sampler2D u_image;
    uniform sampler2D u_palette;

    void main() {
      float index = texture2D(u_image, vec2(v_texcoord.x, 1.0 - v_texcoord.y)).r * 255.0 - 1.0;
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (DrawImageRenderer)');
    return program;
  }
}
