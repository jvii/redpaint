import { canvasToWebGLCoordY, canvasToWebGLCoordX, shiftLine } from '../../util/util';
import { Point } from '../../../types';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { overmind } from '../../..';
import { LineH } from '../../../domain/LineH';
import { LineV } from '../../../domain/LineV';
import { paintingCanvasController } from '../../paintingCanvas/PaintingCanvasController';

export class OverlaySelectionIndicatorRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private canvasTexture: WebGLTexture | null = null;
  private lastCanvasUpdate = 1;
  // attribute/uniform locations are looked up once here: getUniformLocation /
  // getAttribLocation are driver round-trips, too slow for per-draw-call use.
  // (This renderer used to query gl.getParameter(CURRENT_PROGRAM) per draw,
  // which returns null after a WebGL context loss — Safari's strict bindings
  // then throw a TypeError on the getUniformLocation call.)
  private a_position: number;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    // createProgram leaves the program bound; the canvas texture is always in
    // texture unit 3, so the sampler uniform can be set once
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_canvasTexture'), 3);
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed
   */
  public dispose(): void {
    console.log('Disposing OverlaySelectionIndicatorRenderer');
    if (this.canvasTexture) {
      this.gl.deleteTexture(this.canvasTexture);
      this.canvasTexture = null;
    }
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  public renderSelectionBox(start: Point, end: Point): void {
    const gl = this.gl;

    activateProgram(gl, this.program);
    this.updateCanvasTexture();

    // vertex coords

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const boxLines = [
      new LineH(start, { x: end.x, y: start.y }),
      new LineV({ x: end.x, y: start.y }, end),
      new LineH(end, { x: start.x, y: end.y }),
      new LineV({ x: start.x, y: end.y }, start),
    ];

    const vertices = new Float32Array(2 * 2 * boxLines.length);
    for (let i = 0; i < boxLines.length; i++) {
      const shiftedLine = shiftLine(boxLines[i]);
      vertices[i * 4] = canvasToWebGLCoordX(gl, shiftedLine.p1.x);
      vertices[i * 4 + 1] = canvasToWebGLCoordY(gl, shiftedLine.p1.y);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, shiftedLine.p2.x);
      vertices[i * 4 + 3] = canvasToWebGLCoordY(gl, shiftedLine.p2.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    this.gl.drawArrays(gl.LINES, 0, 2 * boxLines.length);
  }

  // A closed outline through arbitrary (not axis-aligned) corner points, in
  // the same color-inverting style — the rotating box of the brush-rotate
  // drag. Plain +0.5 pixel centering; the axis-aligned endpoint stretching
  // shiftLine does would warp slanted lines.
  public renderSelectionPolygon(points: Point[]): void {
    const gl = this.gl;

    activateProgram(gl, this.program);
    this.updateCanvasTexture();

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const vertices = new Float32Array(2 * 2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const from = points[i];
      const to = points[(i + 1) % points.length];
      vertices[i * 4] = canvasToWebGLCoordX(gl, from.x + 0.5);
      vertices[i * 4 + 1] = canvasToWebGLCoordY(gl, from.y + 0.5);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, to.x + 0.5);
      vertices[i * 4 + 3] = canvasToWebGLCoordY(gl, to.y + 0.5);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    this.gl.drawArrays(gl.LINES, 0, 2 * points.length);
  }

  public renderSelectionCrosshair(point: Point): void {
    const gl = this.gl;

    activateProgram(gl, this.program);
    this.updateCanvasTexture();

    // vertex coords

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const crosshairLines = [
      new LineH({ x: 0, y: point.y }, { x: overmind.state.canvas.resolution.width, y: point.y }),
      new LineV({ x: point.x, y: 0 }, { x: point.x, y: overmind.state.canvas.resolution.height }),
    ];

    const vertices = new Float32Array(2 * 2 * crosshairLines.length);
    for (let i = 0; i < crosshairLines.length; i++) {
      const shiftedLine = shiftLine(crosshairLines[i]);
      vertices[i * 4] = canvasToWebGLCoordX(gl, shiftedLine.p1.x);
      vertices[i * 4 + 1] = canvasToWebGLCoordY(gl, shiftedLine.p1.y);
      vertices[i * 4 + 2] = canvasToWebGLCoordX(gl, shiftedLine.p2.x);
      vertices[i * 4 + 3] = canvasToWebGLCoordY(gl, shiftedLine.p2.y);
    }

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    this.gl.drawArrays(gl.LINES, 0, 2 * crosshairLines.length);
  }

  // re-upload the main canvas into the texture if it changed
  private updateCanvasTexture(): void {
    if (this.lastCanvasUpdate !== overmind.state.undo.lastUndoPointTime) {
      this.loadMainCanvasAsTexture();
      this.lastCanvasUpdate = overmind.state.undo.lastUndoPointTime;
    }
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;

    varying vec2 v_texCoord;

    void main () {
      gl_Position = a_position;
      gl_PointSize = 1.0;

      // Pass the texcoord to the fragment shader.
      v_texCoord = a_position.xy * vec2(0.5, -0.5) + 0.5;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_canvasTexture;
    varying vec2 v_texCoord;

    void main () {
      vec4 color = texture2D(u_canvasTexture, v_texCoord);
      // Invert the original color
      gl_FragColor = vec4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, 1);
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (OverlaySelectionIndicator)');

    return program;
  }

  private loadMainCanvasAsTexture(): void {
    const gl = this.gl;

    // We store the canvas as a source texture in texture unit 3 so we
    // call gl.activeTexture(gl.TEXTURE3) before gl.bindTexture

    gl.activeTexture(gl.TEXTURE3);

    // one texture, created once and re-uploaded into — creating a new
    // texture per update without deleting the old one leaks a full
    // canvas-sized texture per undo point
    if (!this.canvasTexture) {
      this.canvasTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.canvasTexture);

      // Set the parameters so we can render any size image.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.canvasTexture);
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paintingCanvasController.mainCanvas
    );
  }
}
