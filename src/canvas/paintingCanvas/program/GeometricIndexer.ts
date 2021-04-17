import { Line, Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftLine, shiftPoint } from '../../util/util';
import { createProgram, useProgram } from '../../util/webglUtil';

export class GeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private currentColorIndex = 0;

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
  }

  public indexPoints(points: Point[], colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordY(gl, shiftedPoint.y);
    }

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public indexLines(lines: Line[], colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

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

  public indexQuad(start: Point, end: Point, colorIndex: number): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.program, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

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

    uniform float u_colorIndex;

    void main () {
      gl_FragColor = vec4(u_colorIndex/255.0, 0.0, 0.0, 1.0);
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (GeometricIndexer)');
    return program;
  }
}
