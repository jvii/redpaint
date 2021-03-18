/* eslint-disable max-len */
import { Line, Point } from '../../types';
import {
  canvasToWebGLCoordInvert,
  canvasToWebGLCoordX,
  canvasToWebGLCoordY,
  shiftLine,
  shiftPoint,
} from '../../colorIndex/util';
import { overmind } from '../..';

export class OverlayGeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private currentColorIndex = 0;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initShaders();
  }

  public renderPoints(points: Point[], colorIndex: number): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program GeometricRenderer');
      gl.useProgram(this.program);
    }

    this.updateColor(colorIndex);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[], colorIndex: number): void {
    const gl = this.gl;

    if (!this.program) {
      return;
    }
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.program) {
      console.log('switching webgl program GeometricRenderer');
      gl.useProgram(this.program);
    }

    this.updateColor(colorIndex);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

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

  private updateColor(colorIndex: number) {
    if (colorIndex == this.currentColorIndex) {
      return;
    }

    if (!this.program) {
      return;
    }
    const gl = this.gl;

    console.log('updating color uniform');
    this.currentColorIndex = colorIndex;
    const color = overmind.state.palette.paletteArray[colorIndex - 1];
    const u_color = gl.getUniformLocation(this.program, 'u_color');
    gl.uniform3f(u_color, color.r, color.g, color.b);
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

    uniform vec3 u_color;

    void main () {
      gl_FragColor = vec4(u_color.x/255.0, u_color.y/255.0, u_color.z/255.0, 1.0);
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
