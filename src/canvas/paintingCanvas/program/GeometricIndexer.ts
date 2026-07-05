import { Line, PaintColor, Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftLine, shiftPoint } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR, CanvasColorIndex } from '../../../domain/CanvasColorIndex';

export class GeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private currentPackedPixel = 0; // 0 is never a valid packed pixel
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private u_pixel: WebGLUniformLocation | null;
  private a_position: number;

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.u_pixel = gl.getUniformLocation(this.program, 'u_pixel');
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
  }

  // Sets the pixel value to write: an indexed pixel for palette colors, a
  // true-color pixel for RGB colors (see docs/true-color-mode.md).
  private updatePixelUniform(color: PaintColor): void {
    const packed = CanvasColorIndex.packPaintColor(color);
    if (packed === this.currentPackedPixel) {
      return;
    }
    this.currentPackedPixel = packed;
    if (color.kind === 'rgb') {
      const { r, g, b } = color.color;
      this.gl.uniform4f(this.u_pixel, r / 255, g / 255, b / 255, ALPHA_TRUECOLOR / 255);
    } else {
      // stored 0-based: color number 1 is palette texel 0
      this.gl.uniform4f(this.u_pixel, (color.colorNumber - 1) / 255, 0, 0, ALPHA_INDEXED / 255);
    }
  }

  public indexPoints(points: Point[], color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    this.updatePixelUniform(color);

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
    gl.enableVertexAttribArray(this.a_position);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordY(gl, shiftedPoint.y);
    }

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public indexLines(lines: Line[], color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    this.updatePixelUniform(color);

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
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

  public indexQuad(start: Point, end: Point, color: PaintColor): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    this.updatePixelUniform(color);

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
    gl.enableVertexAttribArray(this.a_position);

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
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    // The complete tagged pixel value to write (indexed or true color),
    // prepared on the JS side. See docs/true-color-mode.md.
    uniform vec4 u_pixel;

    void main () {
      gl_FragColor = u_pixel;
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (GeometricIndexer)');
    return program;
  }

  /**
   * Cleans up WebGL resources when the indexer is no longer needed
   */
  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
