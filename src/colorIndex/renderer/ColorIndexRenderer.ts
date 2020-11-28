import { Color } from '../../types';

/* eslint-disable @typescript-eslint/camelcase */
export class ColorIndexRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public render(
    destinationCanvasContext: CanvasRenderingContext2D,
    index: Uint8Array,
    palette: Color[]
  ): void {
    const gl = this.gl;
    const program = this.program;
    if (!program) {
      return;
    }

    const imageLoc = gl.getUniformLocation(program, 'u_image');
    const paletteLoc = gl.getUniformLocation(program, 'u_palette');
    // tell it to use texture units 0 and 1 for the image and palette
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);

    // Setup a unit quad
    const positions = [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
    const vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Setup palette

    const paletteTexture = new Uint8Array(256 * 4);

    for (let i = 0; i < palette.length; i++) {
      paletteTexture[i * 4 + 0] = palette[i].r;
      paletteTexture[i * 4 + 1] = palette[i].g;
      paletteTexture[i * 4 + 2] = palette[i].b;
      paletteTexture[i * 4 + 3] = 255;
    }

    // Testing: change color 4 to white
    paletteTexture[3 * 4 + 0] = 255;
    paletteTexture[3 * 4 + 1] = 255;
    paletteTexture[3 * 4 + 2] = 255;

    // make palette texture and upload palette
    gl.activeTexture(gl.TEXTURE1);
    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture);
    console.log('palette:' + paletteTexture);

    // upload color index texture
    gl.activeTexture(gl.TEXTURE0);
    const imageTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const level = 0;
    const internalFormat = gl.RGBA;
    const targetTextureWidth = gl.drawingBufferWidth;
    const targetTextureHeight = gl.drawingBufferHeight;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      index
    );

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
    destinationCanvasContext.clearRect(
      0,
      0,
      destinationCanvasContext.canvas.width,
      destinationCanvasContext.canvas.height
    );
    destinationCanvasContext.drawImage(gl.canvas, 0, 0);
    console.log('rendered');
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
      float index = texture2D(u_image, v_texcoord).r * 255.0 - 1.0;
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
    console.log('Program ready (ColorIndexRenderer)');
  }
}