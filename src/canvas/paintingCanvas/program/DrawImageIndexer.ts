import { CustomBrush } from '../../../brush/CustomBrush';
import { Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftPoint } from '../../util';
import { createProgram, useProgram } from '../../webglUtil';
import { PaintingCanvasController } from '../PaintingCanvasController';

export class DrawImageIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  private currentBrushId = 0;
  private paintingCanvasController: PaintingCanvasController;

  public constructor(
    gl: WebGLRenderingContext,
    targetFrameBuffer: WebGLFramebuffer,
    paintingCanvasController: PaintingCanvasController
  ) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.paintingCanvasController = paintingCanvasController;
    console.log('new');
  }

  public indexDrawImage(points: Point[], brush: CustomBrush): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    if (this.currentBrushId !== brush.lastChanged) {
      console.log('loading texture for brush');
      this.loadBrushAsTexture(brush);
      console.log(this.currentBrushId);
      console.log(brush.lastChanged);
    }
    this.currentBrushId = brush.lastChanged;

    const u_Sampler = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_Sampler');
    gl.uniform1i(u_Sampler, 2); // texture unit 2

    const textureCoords = new Float32Array(12 * points.length);
    const vertices = new Float32Array(12 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      const xLeft = canvasToWebGLCoordX(gl, shiftedPoint.x);
      const xRight = canvasToWebGLCoordX(gl, shiftedPoint.x + brush.width);
      const yTop = canvasToWebGLCoordY(gl, shiftedPoint.y);
      const yBottom = canvasToWebGLCoordY(gl, shiftedPoint.y + brush.heigth);

      const offset = i * 12;

      // 1st triangle

      vertices[0 + offset] = xLeft;
      vertices[1 + offset] = yTop;
      textureCoords[0 + offset] = 0.0;
      textureCoords[1 + offset] = 1.0;

      vertices[2 + offset] = xLeft;
      vertices[3 + offset] = yBottom;
      textureCoords[2 + offset] = 0.0;
      textureCoords[3 + offset] = 0.0;

      vertices[4 + offset] = xRight;
      vertices[5 + offset] = yTop;
      textureCoords[4 + offset] = 1.0;
      textureCoords[5 + offset] = 1.0;

      // 2nd triangle

      vertices[6 + offset] = xLeft;
      vertices[7 + offset] = yBottom;
      textureCoords[6 + offset] = 0.0;
      textureCoords[7 + offset] = 0.0;

      vertices[8 + offset] = xRight;
      vertices[9 + offset] = yTop;
      textureCoords[8 + offset] = 1.0;
      textureCoords[9 + offset] = 1.0;

      vertices[10 + offset] = xRight;
      vertices[11 + offset] = yBottom;
      textureCoords[10 + offset] = 1.0;
      textureCoords[11 + offset] = 0.0;
    }

    // texture coords

    gl.bindBuffer(gl.ARRAY_BUFFER, this.paintingCanvasController.buffers.textureCoordBuffer);

    const a_TexCoord = gl.getAttribLocation(this.program, 'a_TexCoord');
    gl.enableVertexAttribArray(a_TexCoord);

    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      // eslint-disable-next-line prettier/prettier
      textureCoords,
      gl.DYNAMIC_DRAW
    );

    // vertex coords

    gl.bindBuffer(gl.ARRAY_BUFFER, this.paintingCanvasController.buffers.vertexBuffer);

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    /* const shiftedPoint = shiftPoint(point);
    const xLeft = canvasToWebGLCoordX(gl, shiftedPoint.x);
    const xRight = canvasToWebGLCoordX(gl, shiftedPoint.x + brush.width);
    const yTop = canvasToWebGLCoordY(gl, shiftedPoint.y);
    const yBottom = canvasToWebGLCoordY(gl, shiftedPoint.y + brush.heigth);

    const vertices = new Float32Array(12);

    // 1st triangle

    vertices[0] = xLeft;
    vertices[1] = yTop;

    vertices[2] = xLeft;
    vertices[3] = yBottom;

    vertices[4] = xRight;
    vertices[5] = yTop;

    // 2nd triangle

    vertices[6] = xLeft;
    vertices[7] = yBottom;

    vertices[8] = xRight;
    vertices[9] = yTop;

    vertices[10] = xRight;
    vertices[11] = yBottom; */

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    this.gl.drawArrays(gl.TRIANGLES, 0, points.length * 6);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;

    varying vec2 v_TexCoord;

    void main () {
      gl_Position = a_Position;

      // Pass the texcoord to the fragment shader.
      v_TexCoord = a_TexCoord;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;

    void main () {
      vec4 color = texture2D(u_Sampler, v_TexCoord);
      if (color.r == 0.0) {
        discard; // zero means this pixel of the brush is transparent
      }

      gl_FragColor = color;
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (DrawImageIndexer)');

    return program;
  }

  private loadBrushAsTexture(brush: CustomBrush): void {
    const gl = this.gl;

    // We store the brush as a source texture in texture unit 2 so we
    // call gl.activeTexture before gl.bindTexture

    gl.activeTexture(gl.TEXTURE2);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = brush.width;
    const height = brush.heigth;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      brush.brushColorIndex
    );

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    console.log(brush.brushColorIndex);
  }
}
