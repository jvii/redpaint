import { GeometricIndexer } from './program/GeometricIndexer';
import { DrawImageIndexer } from './program/DrawImageIndexer';
import { Line, Point } from '../../types';
import { CustomBrush } from '../../brush/CustomBrush';
import { visualiseTexture } from '../util/util';
import { LineV } from '../../domain/LineV';
import { LineH } from '../../domain/LineH';
import { overmind } from '../..';

type GLBuffers = {
  colorIndexFramebuffer: WebGLFramebuffer;
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

export class ColorIndexer {
  private gl: WebGLRenderingContext;
  private colorIndexFramebuffer: WebGLFramebuffer;
  private geometricIndexer: GeometricIndexer;
  private drawImageIndexer: DrawImageIndexer;

  constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;
    this.colorIndexFramebuffer = buffers.colorIndexFramebuffer;

    // create indexers

    this.geometricIndexer = new GeometricIndexer(gl, buffers.colorIndexFramebuffer);
    this.drawImageIndexer = new DrawImageIndexer(gl, buffers);
  }

  points(points: Point[], colorIndex: number): void {
    this.geometricIndexer.indexPoints(points, colorIndex);
  }

  lines(lines: (LineH | LineV)[], colorIndex: number): void {
    this.geometricIndexer.indexLines(lines, colorIndex);
  }

  quad(start: Point, end: Point, colorIndex: number): void {
    this.geometricIndexer.indexQuad(start, end, colorIndex);
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.drawImageIndexer.indexDrawImage(points, brush);
  }

  getIndex(): Uint8Array {
    const gl = this.gl;

    const width = overmind.state.canvas.resolution.width;
    const height = overmind.state.canvas.resolution.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFramebuffer);
    this.colorIndexFramebuffer;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }

  setIndex(colorIndex: Uint8Array): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);

    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const targetTextureWidth = overmind.state.canvas.resolution.width;
    const targetTextureHeight = overmind.state.canvas.resolution.height;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      colorIndex
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

    // attach the texture as the first color attachment of the framebuffer

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFramebuffer);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
  }

  getAreaFromIndex(
    x: number, // canvas coord (origin upper left corner)
    y: number, // canvas coord (origin upper left corner)
    width: number, // canvas coord, can be negative
    height: number // canvas coord, can be negative
  ): Uint8Array | undefined {
    const gl = this.gl;

    // for readPixels we need to define the area with:
    // - lower left corner of the area and
    // - width and height as positive integers
    // Texture coordinates

    let rectLowerLeftX: number;
    let rectLowerLeftY: number;

    if (width < 0) {
      rectLowerLeftX = x - Math.abs(width);
    } else {
      rectLowerLeftX = x;
    }

    if (height < 0) {
      rectLowerLeftY = gl.drawingBufferHeight - y;
    } else {
      rectLowerLeftY = gl.drawingBufferHeight - y - Math.abs(height);
    }

    const pixels = new Uint8Array(Math.abs(width) * Math.abs(height) * 4);
    console.log('canvas: x:' + x + ' y: ' + y + ' w: ' + width + ' h: ' + height);
    console.log(
      'texture: x:' +
        rectLowerLeftX +
        ' y: ' +
        rectLowerLeftY +
        ' w: ' +
        Math.abs(width) +
        ' h: ' +
        Math.abs(height)
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFramebuffer);
    gl.readPixels(
      rectLowerLeftX,
      rectLowerLeftY,
      Math.abs(width),
      Math.abs(height),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }

  // testing, debugging purposes only
  visualiseIndex(): void {
    const gl = this.gl;

    const index = this.getIndex();
    const width = gl.drawingBufferWidth;
    visualiseTexture(index, width);
  }
}
