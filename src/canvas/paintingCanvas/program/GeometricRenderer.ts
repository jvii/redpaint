import { Line, Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftLine, shiftPoint } from '../../util/util';
import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import { ALPHA_TAG_LIB } from '../../util/alphaTagShaderLib';
import { stencil } from '../../Stencil';
import { STENCIL_TEXTURE_UNIT } from '../../util/stencilTexture';

export class GeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private a_position: number;
  private u_resolution: WebGLUniformLocation | null;
  private u_stencil: WebGLUniformLocation | null;
  private u_stencilOn: WebGLUniformLocation | null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.u_resolution = gl.getUniformLocation(this.program, 'resolution');
    this.u_stencil = gl.getUniformLocation(this.program, 'u_stencil');
    this.u_stencilOn = gl.getUniformLocation(this.program, 'u_stencilOn');
    // createProgram leaves the program bound; the texture units never change
    // (0 = color indices, 1 = palette), so the samplers can be set once
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_colorIndexTexture'), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_palette'), 1);
  }

  // Set per draw rather than once: the stencil can be made, suspended or freed
  // between any two strokes.
  private updateStencilUniforms(): void {
    this.gl.uniform1i(this.u_stencil, STENCIL_TEXTURE_UNIT);
    this.gl.uniform1f(this.u_stencilOn, stencil.active ? 1 : 0);
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
    bindFramebuffer(gl, null);

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
    this.updateStencilUniforms();

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  public renderLines(lines: Line[]): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // render to the canvas
    bindFramebuffer(gl, null);

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
    this.updateStencilUniforms();

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
    ${ALPHA_TAG_LIB}

    uniform vec2 resolution;
    uniform sampler2D u_colorIndexTexture;
    uniform sampler2D u_palette;
    uniform sampler2D u_stencil;
    uniform float u_stencilOn;

    void main() {
      vec2 position = vec2((gl_FragCoord.x) / (resolution.x), (gl_FragCoord.y / (resolution.y)));
      vec4 pixel = texture2D(u_colorIndexTexture, position);

      // This pass paints single pixels straight to the screen, skipping the
      // full redraw that composites the stencil (DrawImageRenderer), so it has
      // to honour the stencil itself: the color index already holds the new
      // paint, which the repair pass undoes later.
      vec4 stencilPixel = texture2D(u_stencil, position);
      float restore = (1.0 - float(isTransparent(stencilPixel))) * u_stencilOn;
      pixel = mix(pixel, stencilPixel, restore);

      if (isTrueColor(pixel)) {
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
