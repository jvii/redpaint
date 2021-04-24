/* eslint-disable max-len */

import { canvasToWebGLCoordY, canvasToWebGLCoordX, shiftLine, shiftPoint } from '../../util/util';
import { Line, Point } from '../../../types';
import { createProgram, useProgram } from '../../util/webglUtil';

export class OverlayGeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private currentColorIndex = 0;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
  }

  public renderPoints(points: Point[], colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    this.updateColorIndex(colorIndex);

    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordY(gl, shiftedPoint.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[], colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    this.updateColorIndex(colorIndex);

    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const vertices = new Float32Array(2 * 2 * lines.length);
    for (let i = 0; i < lines.length; i++) {
      const shiftedLine = shiftLine(lines[i]);
      vertices[i * 4] = canvasToWebGLCoordX(gl, shiftedLine.p1.x);
      vertices[i * 4 + 1] = canvasToWebGLCoordY(gl, shiftedLine.p1.y);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, shiftedLine.p2.x);
      vertices[i * 4 + 3] = canvasToWebGLCoordY(gl, shiftedLine.p2.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.LINES, 0, 2 * lines.length);
  }

  public renderQuad(start: Point, end: Point, colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    this.updateColorIndex(colorIndex);

    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const shiftedStart = shiftPoint(start);
    const shiftedEnd = shiftPoint(end);
    const xLeft = canvasToWebGLCoordX(gl, shiftedStart.x);
    const xRight = canvasToWebGLCoordX(gl, shiftedEnd.x);
    const yTop = canvasToWebGLCoordY(gl, shiftedStart.y);
    const yBottom = canvasToWebGLCoordY(gl, shiftedEnd.y);

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

  private updateColorIndex(colorIndex: number) {
    if (colorIndex == this.currentColorIndex) {
      return;
    }

    if (!this.program) {
      return;
    }
    const gl = this.gl;

    console.log('updating color index uniform');
    this.currentColorIndex = colorIndex;
    const u_color_index = gl.getUniformLocation(this.program, 'u_color_index');
    gl.uniform1f(u_color_index, this.currentColorIndex - 1);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_Position;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform float u_color_index;
    uniform sampler2D u_palette;

    void main() {

      gl_FragColor = texture2D(u_palette, vec2((u_color_index + 0.5) / 256.0, 0.5));
      //gl_FragColor = vec4(1,1,1,1);
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (DrawImageIndexer)');

    return program;
  }
}
