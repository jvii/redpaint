import { canvasToWebGLCoordY, canvasToWebGLCoordX, shiftLine } from '../../util/util';
import { Point } from '../../../types';
import { createProgram, useProgram } from '../../util/webglUtil';
import { overmind } from '../../..';
import { LineH } from '../../../domain/LineH';
import { LineV } from '../../../domain/LineV';
import { paintingCanvasController } from '../../paintingCanvas/PaintingCanvasController';

export class OverlaySelectionIndicatorRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private lastCanvasUpdate = 1;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
  }

  public renderSelectionBox(start: Point, end: Point): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // update canvas texture if necessary

    if (this.lastCanvasUpdate !== overmind.state.undo.lastUndoPointTime) {
      console.log('loading canvas to texture');
      this.loadMainCanvasAsTexture();
      this.lastCanvasUpdate = overmind.state.undo.lastUndoPointTime;
    }

    const u_CanvasTexture = gl.getUniformLocation(
      gl.getParameter(gl.CURRENT_PROGRAM),
      'u_CanvasTexture'
    );
    gl.uniform1i(u_CanvasTexture, 3); // texture unit 3

    // vertex coords

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

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

  public renderSelectionCrosshair(point: Point): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // update canvas texture if necessary

    if (this.lastCanvasUpdate !== overmind.state.undo.lastUndoPointTime) {
      console.log('loading canvas to texture');
      this.loadMainCanvasAsTexture();
      this.lastCanvasUpdate = overmind.state.undo.lastUndoPointTime;
    }

    const u_CanvasTexture = gl.getUniformLocation(
      gl.getParameter(gl.CURRENT_PROGRAM),
      'u_CanvasTexture'
    );
    gl.uniform1i(u_CanvasTexture, 3); // texture unit 3

    // vertex coords

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

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

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_Position;

    varying vec2 v_TexCoord;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;

      // Pass the texcoord to the fragment shader.
      v_TexCoord = a_Position.xy * vec2(0.5, -0.5) + 0.5;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_CanvasTexture;
    varying vec2 v_TexCoord;

    void main () {
      vec4 textureColor = texture2D(u_CanvasTexture, v_TexCoord);
      gl_FragColor = vec4(1.0 - textureColor.r, 1.0 - textureColor.g, 1.0 - textureColor.b, 1);
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (OverlaySelectionIndicator)');

    return program;
  }

  private loadMainCanvasAsTexture(): void {
    const gl = this.gl;

    // We store the canvas as a source texture in texture unit  so we
    // call gl.activeTexture(gl.TEXTURE3) before gl.bindTexture

    gl.activeTexture(gl.TEXTURE3);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paintingCanvasController.mainCanvas
    );

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    console.log('Loaded canvas as texture');
  }
}
