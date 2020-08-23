/* eslint-disable @typescript-eslint/camelcase */
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../util';
import { CustomBrush } from '../../brush/CustomBrush';

export class DrawImageIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private currentBrushId = 0;
  private currentBrushWidth = 0;
  private currentBrushHeight = 0;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public indexDrawImage(x: number, y: number, brush: CustomBrush): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program');
      gl.useProgram(this.program);
    }

    /*     console.log('drawImage');
    console.log('x: ' + x + ', x(gl): ' + canvasToWebGLCoordX(gl, x));
    console.log('y: ' + y + ', y(gl): ' + canvasToWebGLCoordY(gl, y));
    console.log('width: ' + this.currentBrushWidth);
    console.log('heigth: ' + this.currentBrushHeight); */

    const xLeft = canvasToWebGLCoordX(gl, x);
    const xRight = canvasToWebGLCoordX(gl, x + this.currentBrushWidth);
    const yTop = canvasToWebGLCoordY(gl, y);
    const yBottom = canvasToWebGLCoordY(gl, y + this.currentBrushHeight);

    const vertices = new Float32Array(8);
    vertices[0] = xLeft;
    vertices[1] = yTop;

    vertices[2] = xLeft;
    vertices[3] = yBottom;

    vertices[4] = xRight;
    vertices[5] = yTop;

    vertices[6] = xRight;
    vertices[7] = yBottom;

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private initShaders(): void {
    const vertexShader = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;

    varying vec2 v_TexCoord;

    void main () {
      gl_Position = a_Position;

      // Pass the texcoord to the fragment shader.
      v_TexCoord = a_TexCoord;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;

    void main () {
      gl_FragColor = texture2D(u_Sampler, v_TexCoord);
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
    console.log('Program ready (DrawImageIndexer)');

    // Create a buffer object for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
      console.log('Failed to create the buffer object (textureCoordBuffer)');
      return;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');

    // We'll supply texcoords as floats.
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(a_TexCoord);

    // Create a buffer object for vertex coordinates
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object (vertexBuffer)');
      return;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const a_Position = gl.getAttribLocation(program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    this.loadBrushAsTexture();
  }

  private loadBrushAsTexture(): void {
    const gl = this.gl;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 2;
    const height = 2;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255]); // 2x2 brush
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const u_Sampler = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler');
    gl.uniform1i(u_Sampler, 0); // texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler, 0);

    this.currentBrushHeight = 2;
    this.currentBrushWidth = 2;
  }
}
