import { GeometricIndexer } from './indexers/GeometricIndexer';
import { DrawImageIndexer } from './indexers/DrawImageIndexer';
import { CustomBrush } from '../brush/CustomBrush';
import { overmind } from '../index';
import { Line, Point } from '../types';
import { visualiseTexture } from './util';

class ColorIndexer {
  private gl: WebGLRenderingContext;
  private geometricIndexer: GeometricIndexer;
  private drawImageIndexer: DrawImageIndexer;

  constructor() {
    this.gl = this.createIndexerGLContext(0, 0, 0);

    // create indexers

    this.geometricIndexer = new GeometricIndexer(this.gl);
    this.drawImageIndexer = new DrawImageIndexer(this.gl);
  }

  private createIndexerGLContext(
    width: number,
    height: number,
    backgroundColorId: number
  ): WebGLRenderingContext {
    // init a webgl context for a canvas element outside the DOM

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
    });

    if (!gl) {
      alert('Sorry, ReDPaint requires WebGL support:(');
      throw 'Sorry, ReDPaint requires WebGL support';
    }
    return gl;
  }

  init(): void {
    const width = overmind.state.canvas.resolution.width;
    const height = overmind.state.canvas.resolution.height;
    const backgroundColorId = Number(overmind.state.palette.backgroundColorId);
    console.log(`ColorIndexer init, width=${width}, heigth=${height}`);
    this.gl = this.createIndexerGLContext(width, height, backgroundColorId);

    // create indexers

    this.geometricIndexer = new GeometricIndexer(this.gl);
    this.drawImageIndexer = new DrawImageIndexer(this.gl);
  }

  fillRect(start: Point, end: Point, colorIndex: number): void {
    this.geometricIndexer.indexFillRect(start, end, colorIndex);
  }

  points(points: Point[], colorIndex: number): void {
    this.geometricIndexer.indexPoints(points, colorIndex);
  }

  lines(lines: Line[], colorIndex: number): void {
    this.geometricIndexer.indexLines(lines, colorIndex);
  }

  drawImage(x: number, y: number, brush: CustomBrush): void {
    this.drawImageIndexer.indexDrawImage(x, y, brush);
  }

  getIndexAsCanvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.gl.canvas;
  }

  getIndex(): Uint8Array {
    const pixels = new Uint8Array(this.gl.drawingBufferHeight * this.gl.drawingBufferWidth * 4);
    this.gl.readPixels(
      0,
      0,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels
    );
    return pixels;
  }

  resetIndex(): void {
    /* const gl = this.gl;

    // create a texture to render to

    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const targetTextureWidth = gl.drawingBufferWidth;
    const targetTextureHeight = gl.drawingBufferHeight;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    // initialize the color index matrix with the background color
    const backgroundColor = Number(overmind.state.palette.backgroundColorId);
    const data = new Uint8Array(gl.drawingBufferHeight * gl.drawingBufferWidth * 4).fill(
      backgroundColor
    );
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create and bind the framebuffer

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
    */
  }

  setIndex(index: Uint8Array | null): void {
    /* if (!index) {
      return;
    }

    const gl = this.gl;

    // create a texture to render to

    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const targetTextureWidth = gl.drawingBufferWidth;
    const targetTextureHeight = gl.drawingBufferHeight;
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
      index
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create and bind the framebuffer

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // attach the texture as the first color attachment

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
    */
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
    console.log('gl.drawingBufferHeight: ' + gl.drawingBufferHeight);
    gl.readPixels(
      rectLowerLeftX,
      rectLowerLeftY,
      Math.abs(width),
      Math.abs(height),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );
    return pixels;
  }

  getColorIndexForPixel(point: Point): number | undefined {
    const colorIndex = this.getAreaFromIndex(point.x, point.y, 1, 1);
    return colorIndex?.[0];
  }

  // testing, debugging purposes only
  visualiseIndex(): void {
    const index = this.getIndex();
    const width = this.gl.drawingBufferWidth;
    visualiseTexture(index, width);
  }
}

export const colorIndexer = new ColorIndexer();
