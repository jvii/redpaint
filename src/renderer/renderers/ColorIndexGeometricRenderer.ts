/* eslint-disable max-len */
import { Line, Point } from '../../types';
import {
  canvasToWebGLCoordInvert,
  canvasToWebGLCoordX,
  canvasToWebGLCoordY,
  shiftLine,
  shiftPoint,
} from '../../colorIndex/util';
import { paintingCanvasController } from '../../canvas/PaintingCanvasController';

export class ColorIndexGeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public renderPoints(points: Point[]): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program GeometricRenderer');
      gl.useProgram(this.program);
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // update color index texture

    /* gl.activeTexture(gl.TEXTURE0);
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = colorIndexer.getIndexAsCanvas();
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, indexCanvas); */

    /*     gl.activeTexture(gl.TEXTURE0);
    const level = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = paintingCanvasController.colorIndexer?.getIndexAsCanvas();
    if (!indexCanvas) {
      throw 'no indexcanvas';
    }
    gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, format, type, indexCanvas); */

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);
    }

    const resolution = gl.getUniformLocation(this.program, 'resolution');
    this.gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[]): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program GeometricRenderer');
      gl.useProgram(this.program);
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // update color index texture

    /*     gl.activeTexture(gl.TEXTURE0);
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = colorIndexer.getIndexAsCanvas();
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, indexCanvas); */

    /*     gl.activeTexture(gl.TEXTURE0);
    const level = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = colorIndexer.getIndexAsCanvas();
    gl.texSubImage2D(gl.TEXTURE_2D, level, 0, 0, format, type, indexCanvas); */

    const vertices = new Float32Array(2 * 2 * lines.length);
    for (let i = 0; i < lines.length; i++) {
      const shiftedLine = shiftLine(lines[i]);
      vertices[i * 4] = canvasToWebGLCoordX(gl, shiftedLine.p1.x);
      vertices[i * 4 + 1] = canvasToWebGLCoordInvert(gl, shiftedLine.p1.y);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, shiftedLine.p2.x);
      vertices[i * 4 + 3] = canvasToWebGLCoordInvert(gl, shiftedLine.p2.y);
    }

    const resolution = gl.getUniformLocation(this.program, 'resolution');
    this.gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.LINES, 0, 2 * lines.length);
  }

  private initShaders(): void {
    const vertexShader = `
    attribute vec4 a_Position;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform vec2 resolution;
    uniform sampler2D u_image;
    uniform sampler2D u_palette;

    void main() {
      vec2 position = vec2((gl_FragCoord.x) / (resolution.x), 1.0 - (gl_FragCoord.y / (resolution.y)));
      float index = texture2D(u_image, position).r * 255.0 - 1.0;
      /*
      if (index < 0.1) {
        gl_FragColor = vec4(1,1,1,1);
      }
      else {
        gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
      }
      */
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
      //gl_FragColor = vec4(1,1,1,1);
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

    // Create a buffer object for vertex coordinates
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object ');
      return;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const a_Position = gl.getAttribLocation(program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    console.log('Program ready (GeometricRenderer)');
  }
}
