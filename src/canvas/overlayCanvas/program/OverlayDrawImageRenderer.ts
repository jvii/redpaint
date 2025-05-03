import { CustomBrush } from '../../../brush/CustomBrush';
import { canvasToWebGLCoordY, canvasToWebGLCoordX, shiftPoint } from '../../util/util';
import { Point } from '../../../types';
import { createProgram, activateProgram } from '../../util/webglUtil';

type GLBuffers = {
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

export class OverlayDrawImageRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private currentBrushId = 0;
  private buffers: GLBuffers;
  private vertexData: Float32Array;
  private textureCoordData: Float32Array;
  private maxPoints = 1000; // Initial capacity, will grow as needed
  private readonly POINTS_PER_VERTEX = 6; // 2 triangles per point
  private readonly VERTICES_PER_POINT = 12; // 6 vertices * 2 coordinates per vertex
  private readonly TEX_COORDS_PER_POINT = 12; // 6 vertices * 2 texture coordinates per vertex

  public constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;
    this.program = this.createProgram();
    this.buffers = buffers;
    this.vertexData = new Float32Array(this.maxPoints * this.VERTICES_PER_POINT);
    this.textureCoordData = new Float32Array(this.maxPoints * this.TEX_COORDS_PER_POINT);
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed
   */
  public dispose(): void {
    console.log('Disposing OverlayDrawImageRenderer');
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  private ensureCapacity(pointsCount: number): void {
    if (pointsCount > this.maxPoints) {
      // Double the capacity until it's enough
      while (this.maxPoints < pointsCount) {
        this.maxPoints *= 2;
      }

      const newVertexData = new Float32Array(this.maxPoints * this.VERTICES_PER_POINT);
      const newTexCoordData = new Float32Array(this.maxPoints * this.TEX_COORDS_PER_POINT);

      // Copy existing data
      newVertexData.set(this.vertexData);
      newTexCoordData.set(this.textureCoordData);

      this.vertexData = newVertexData;
      this.textureCoordData = newTexCoordData;
    }
  }

  public renderDrawImage(points: Point[], brush: CustomBrush): void {
    const gl = this.gl;
    const pointsCount = points.length;

    if (pointsCount === 0) return;

    activateProgram(gl, this.program);

    console.log('rendering draw image');

    if (this.currentBrushId !== brush.lastChanged) {
      console.log('loading texture for brush');
      this.loadBrushAsTexture(brush);
    }
    this.currentBrushId = brush.lastChanged;

    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(paletteLoc, 1);

    const u_image = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_image');
    gl.uniform1i(u_image, 2); // texture unit 2

    // Ensure we have enough capacity
    this.ensureCapacity(pointsCount);

    // Process all points in a single pass
    for (let i = 0; i < pointsCount; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      const xLeft = canvasToWebGLCoordX(gl, shiftedPoint.x);
      const xRight = canvasToWebGLCoordX(gl, shiftedPoint.x + brush.width);
      const yTop = canvasToWebGLCoordY(gl, shiftedPoint.y);
      const yBottom = canvasToWebGLCoordY(gl, shiftedPoint.y + brush.heigth);

      const offset = i * this.VERTICES_PER_POINT;
      const texOffset = i * this.TEX_COORDS_PER_POINT;

      // 1st triangle
      this.vertexData[offset] = xLeft;
      this.vertexData[offset + 1] = yTop;
      this.textureCoordData[texOffset] = 0.0;
      this.textureCoordData[texOffset + 1] = 1.0;

      this.vertexData[offset + 2] = xLeft;
      this.vertexData[offset + 3] = yBottom;
      this.textureCoordData[texOffset + 2] = 0.0;
      this.textureCoordData[texOffset + 3] = 0.0;

      this.vertexData[offset + 4] = xRight;
      this.vertexData[offset + 5] = yTop;
      this.textureCoordData[texOffset + 4] = 1.0;
      this.textureCoordData[texOffset + 5] = 1.0;

      // 2nd triangle
      this.vertexData[offset + 6] = xLeft;
      this.vertexData[offset + 7] = yBottom;
      this.textureCoordData[texOffset + 6] = 0.0;
      this.textureCoordData[texOffset + 7] = 0.0;

      this.vertexData[offset + 8] = xRight;
      this.vertexData[offset + 9] = yTop;
      this.textureCoordData[texOffset + 8] = 1.0;
      this.textureCoordData[texOffset + 9] = 1.0;

      this.vertexData[offset + 10] = xRight;
      this.vertexData[offset + 11] = yBottom;
      this.textureCoordData[texOffset + 10] = 1.0;
      this.textureCoordData[texOffset + 11] = 0.0;
    }

    // Update texture coordinates buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoordBuffer);
    const a_texCoord = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(a_texCoord);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.textureCoordData.subarray(0, pointsCount * this.TEX_COORDS_PER_POINT),
      gl.DYNAMIC_DRAW
    );

    // Update vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertexBuffer);
    const a_position = gl.getAttribLocation(this.program, 'a_position');
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_position);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.vertexData.subarray(0, pointsCount * this.VERTICES_PER_POINT),
      gl.DYNAMIC_DRAW
    );

    // Draw all points in a single call
    gl.drawArrays(gl.TRIANGLES, 0, pointsCount * this.POINTS_PER_VERTEX);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;
    attribute vec2 a_texCoord;

    varying vec2 v_texCoord;

    void main () {
      gl_Position = a_position;

      // Pass the texture coordinate to the fragment shader.
      v_texCoord = a_texCoord;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_image;
    uniform sampler2D u_palette;
    varying vec2 v_texCoord;

    void main () {
      vec4 colorIndexValue = texture2D(u_image, v_texCoord);
      if (colorIndexValue.r == 0.0) {
        discard; // zero means this pixel of the image (brush) is transparent
      }

      //gl_FragColor = colorIndexValue;
      gl_FragColor = texture2D(u_palette, vec2((colorIndexValue.r) - 1.0/256.0, 0.5));
      //gl_FragColor = vec4(1,1,1,1);
    }
    `;

    const fragmentShaderTrueColor = `
    precision mediump float;

    uniform sampler2D u_image;
    uniform sampler2D u_palette;
    varying vec2 v_texCoord;

    void main () {
      vec4 colorIndexValue = texture2D(u_image, v_texCoord);
      if (colorIndexValue.r == 0.0) {
        discard; // zero means this pixel of the brush is transparent
      }

      if (colorIndexValue.a == 1.0) {
        //gl_FragColor = vec4(colorIndexValue.r, colorIndexValue.g , colorIndexValue.b , 0.0);
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
      else {
        gl_FragColor = texture2D(u_palette, vec2((colorIndexValue.r) - 1.0/256.0, 0.5));
      }
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (OverlayDrawImageRenderer)');

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
      brush.brushColorIndex.indexArray
    );

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
}
