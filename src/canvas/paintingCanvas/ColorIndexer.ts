import { GeometricIndexer } from './program/GeometricIndexer';
import { DrawImageIndexer } from './program/DrawImageIndexer';
import { Line, Point } from '../../types';
import { CustomBrush } from '../../brush/CustomBrush';
import { visualiseTexture } from '../util/util';
import { LineV } from '../../domain/LineV';
import { LineH } from '../../domain/LineH';

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

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFramebuffer);

    const pixels = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4);
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
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
