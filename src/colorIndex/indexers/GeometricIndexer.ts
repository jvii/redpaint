import { Line, Point } from '../../types';
import {
  canvasToWebGLCoordInvert,
  canvasToWebGLCoordX,
  canvasToWebGLCoordY,
  shiftLine,
  shiftPoint,
} from '../util';

export class GeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private currentColorIndex = 0;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public indexPoints(points: Point[], colorIndex: number): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }

    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program');
      gl.useProgram(this.program);
    }

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public indexLines(lines: Line[], colorIndex: number): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }

    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program');
      gl.useProgram(this.program);
    }

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const vertices = new Float32Array(2 * 2 * lines.length);
    for (let i = 0; i < lines.length; i++) {
      const shiftedLine = shiftLine(lines[i]);
      vertices[i * 4] = canvasToWebGLCoordX(gl, shiftedLine.p1.x);
      vertices[i * 4 + 1] = canvasToWebGLCoordInvert(gl, shiftedLine.p1.y);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, shiftedLine.p2.x);
      vertices[i * 4 + 3] = canvasToWebGLCoordInvert(gl, shiftedLine.p2.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.LINES, 0, 2 * lines.length);
  }

  public indexFillRect(start: Point, end: Point, colorIndex: number): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }

    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program');
      gl.useProgram(this.program);
    }

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const width = end.x - start.x;
    const height = end.y - start.y;

    if (width === 1 && height === 1) {
      this.fillRectPoint(start);
    } else {
      this.fillRectQuad(start, end);
    }
  }

  private fillRectPoint(point: Point): void {
    const gl = this.gl;

    const shiftedPoint = shiftPoint(point);

    const vertices = new Float32Array(2);
    vertices[0] = canvasToWebGLCoordX(gl, shiftedPoint.x);
    vertices[1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, 1);
  }

  private fillRectQuad(start: Point, end: Point): void {
    const gl = this.gl;

    const shiftedStart = shiftPoint(start);
    const shiftedEnd = shiftPoint(end);
    const xLeft = canvasToWebGLCoordX(gl, shiftedStart.x);
    const xRight = canvasToWebGLCoordX(gl, shiftedEnd.x);
    const yTop = canvasToWebGLCoordInvert(gl, shiftedStart.y);
    const yBottom = canvasToWebGLCoordInvert(gl, shiftedEnd.y);

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

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform float u_colorIndex;

    void main () {
      gl_FragColor = vec4(u_colorIndex/255.0, 0.0, 0.0, 1.0);
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

    // Compile to program
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    this.program = program;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // Catch some possible errors on program
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }
    console.log('Program ready (FillRectIndexer)');

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
  }
}
