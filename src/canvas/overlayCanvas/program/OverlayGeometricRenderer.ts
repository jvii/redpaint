/* eslint-disable max-len */

import { canvasToWebGLCoordY, canvasToWebGLCoordX, shiftLine, shiftPoint } from '../../util/util';
import { Line, PaintColor, Point } from '../../../types';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { overmind } from '../../..';

export class OverlayGeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private a_position: number;
  private u_color: WebGLUniformLocation | null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.u_color = gl.getUniformLocation(this.program, 'u_color');
  }

  // The preview draws in the final display color, resolved on the JS side
  // (palette lookup for indexed colors, literal RGB for true colors).
  private updateColor(paintColor: PaintColor): void {
    const rgb =
      paintColor.kind === 'rgb'
        ? paintColor.color
        : (overmind.state.palette.displayPalette[String(paintColor.colorNumber)] ?? {
            r: 0,
            g: 0,
            b: 0,
          });
    this.gl.uniform4f(this.u_color, rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed
   */
  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  public renderPoints(points: Point[], color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    this.updateColor(color);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordY(gl, shiftedPoint.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[], color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    this.updateColor(color);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

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

  public renderQuad(start: Point, end: Point, color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    this.updateColor(color);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    // pixel n covers canvas coordinates [n, n+1), so the quad must extend to
    // the far edge of whichever pixel is greater, not just to its center
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x) + 1;
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y) + 1;

    const xLeft = canvasToWebGLCoordX(gl, left);
    const xRight = canvasToWebGLCoordX(gl, right);
    const yTop = canvasToWebGLCoordY(gl, top);
    const yBottom = canvasToWebGLCoordY(gl, bottom);

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

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    // Final display color, resolved on the JS side
    uniform vec4 u_color;

    void main() {
      gl_FragColor = u_color;
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (OverlayGeometricRenderer)');

    return program;
  }
}
