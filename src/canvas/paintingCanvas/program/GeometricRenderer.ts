import { Line, Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftLine, shiftPoint } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';

/* eslint-disable max-len */
export class GeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private a_position: number;
  private u_resolution: WebGLUniformLocation | null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.u_resolution = gl.getUniformLocation(this.program, 'resolution');
    // createProgram leaves the program bound; the texture units never change
    // (0 = color indices, 1 = palette), so the samplers can be set once
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_colorIndexTexture'), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_palette'), 1);
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

  public renderPoints(points: Point[]): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

    this.gl.uniform2f(this.u_resolution, gl.canvas.width, gl.canvas.height);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[]): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

    this.gl.uniform2f(this.u_resolution, gl.canvas.width, gl.canvas.height);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.LINES, 0, 2 * lines.length);
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

    uniform vec2 resolution;
    uniform sampler2D u_colorIndexTexture;
    uniform sampler2D u_palette;

    void main() {
      vec2 position = vec2((gl_FragCoord.x) / (resolution.x), (gl_FragCoord.y / (resolution.y)));
      vec4 pixel = texture2D(u_colorIndexTexture, position);

      if (pixel.a > 0.9) {
        // true-color pixel: the literal RGB color
        gl_FragColor = vec4(pixel.rgb, 1.0);
        return;
      }

      // indexed pixel: R holds the 0-based palette position
      float paletteIndex = pixel.r * 255.0;
      gl_FragColor = texture2D(u_palette, vec2((paletteIndex + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (GeometricRenderer)');
    return program;
  }
}
