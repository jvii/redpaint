import { colorIndexer } from '../../components/canvas/ColorIndexerClass';

export class DrawImageRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public renderCanvas(): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program DrawImageRenderer');
      gl.useProgram(this.program);
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // update color index texture

    gl.activeTexture(gl.TEXTURE0);
    const level = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = colorIndexer.getIndexAsCanvas();
    gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, format, type, indexCanvas);

    // Setup a unit quad

    const positions = [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    // count = positions.length / 2 = 6
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private initShaders(): void {
    const vertexShader = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = a_position;

      // assuming a unit quad for position we can just use that for texcoords
      v_texcoord = a_position.xy * vec2(0.5, 0.5) + 0.5;
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

    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) {
      return;
    }
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    // Catch some possible errors on vertex shader
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      return;
    }
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    // Catch some possible errors on fragment shader
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
    }

    // Compile the program
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    this.program = program;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Catch some possible errors on program
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }

    // tell it to use texture units 0 and 1 for the image and palette

    const imageLoc = gl.getUniformLocation(program, 'u_image');
    const paletteLoc = gl.getUniformLocation(program, 'u_palette');
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);

    // Setup a unit quad

    const positions = [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
    const vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    /*     gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); */

    const a_Position = gl.getAttribLocation(program, 'a_position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    console.log('Program ready (DrawImageRenderer)');
  }
}
