/* eslint-disable max-len */
import { overmind } from '../..';
import { CustomBrush } from '../../brush/CustomBrush';
import { visualiseTexture } from '../../colorIndex/util';
import { Throttle } from '../../tools/util/Throttle';
import { Line, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { DrawImageIndexer } from './program/DrawImageIndexer';
import { DrawImageRenderer } from './program/DrawImageRenderer';
import { GeometricIndexer } from './program/GeometricIndexer';
import { GeometricRenderer } from './program/GeometricRenderer';

// PaintingCanvasController is a singleton responsible for controlling
// the two painting canvases in the app: MainCanvas and ZoomCanvas.
// Note that overlay canvases are controllod separately by OverlayCanvasController.
export class PaintingCanvasController implements CanvasController {
  private mainCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;

  private zoomCanvas: HTMLCanvasElement;
  private zoomCanvasCtx: CanvasRenderingContext2D | null = null;

  private geometricIndexer: GeometricIndexer | null = null;
  private drawImageIndexer: DrawImageIndexer | null = null;
  private geometricRenderer: GeometricRenderer | null = null;
  private drawImageRenderer: DrawImageRenderer | null = null;

  private throttle = new Throttle(1000 / 60);
  private colorIndexFrameBuffer: WebGLFramebuffer | null = null;

  public buffers: { vertexBuffer: WebGLBuffer | null; textureCoordBuffer: WebGLBuffer | null } = {
    vertexBuffer: null,
    textureCoordBuffer: null,
  };

  constructor() {
    this.mainCanvas = document.createElement('canvas');
    this.zoomCanvas = document.createElement('canvas');
  }

  attachMainCanvas(mainCanvas: HTMLCanvasElement): void {
    this.mainCanvas = mainCanvas;

    const gl = mainCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) {
      throw 'No webgl';
    }
    this.gl = gl;
    this.init();
  }

  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void {
    this.zoomCanvas = zoomCanvas;
    this.zoomCanvasCtx = zoomCanvas.getContext('2d', {
      alpha: true,
      // desynchronized caused various problems with Windows version of Chrome
      // TODO: test again with the new version
      desynchronized: false,
    });
  }

  points(points: Point[], colorIndex: number): void {
    this.geometricIndexer?.indexPoints(points, colorIndex);
    this.geometricRenderer?.renderPoints(points);
    this.renderZoomCanvas();
  }

  lines(lines: Line[], colorIndex: number): void {
    //TODO
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.drawImageIndexer?.indexDrawImage(points, brush);
    this.drawImageRenderer?.renderCanvas();
    this.renderZoomCanvas();
  }

  renderZoomCanvas(): void {
    if (!overmind.state.toolbox.zoomModeOn) {
      return;
    }
    // maybe not necessary to clear canvas?
    //this.zoomCanvasCtx?.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
    this.zoomCanvasCtx?.drawImage(this.mainCanvas, 0, 0);
    /*
    // throttle copying to zoomCanvas when drawing on mainCanvas
    // This an optimization for Firefox where copying from gl canvas to 2d canvas is slow
    this.throttle.call((): void => {
      this.zoomCanvasCtx?.drawImage(this.mainCanvas, 0, 0);
    }); */
  }

  getIndex(): Uint8Array {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFrameBuffer);

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

  // testing, debugging purposes only
  visualiseIndex(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const index = this.getIndex();
    const width = gl.drawingBufferWidth;
    visualiseTexture(index, width);
  }

  getAreaFromIndex(
    x: number, // canvas coord (origin upper left corner)
    y: number, // canvas coord (origin upper left corner)
    width: number, // canvas coord, can be negative
    height: number // canvas coord, can be negative
  ): Uint8Array | undefined {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

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
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.colorIndexFrameBuffer);
    gl.readPixels(
      rectLowerLeftX,
      y,
      Math.abs(width),
      Math.abs(height),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }

  init(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // color index texture always in texture unit 0
    // palette texture always in texture unit 1
    // brush texture always in texture unit 2

    const colorIndexFramebuffer = this.initColorIndexTexture();
    this.colorIndexFrameBuffer = colorIndexFramebuffer;
    this.initPaletteTexture();
    this.initVertexBuffer();
    this.initTextureCoordBuffer();

    this.geometricIndexer = new GeometricIndexer(gl, colorIndexFramebuffer);
    this.drawImageIndexer = new DrawImageIndexer(gl, colorIndexFramebuffer, this);

    this.geometricRenderer = new GeometricRenderer(gl);
    this.drawImageRenderer = new DrawImageRenderer(gl);
  }

  private initColorIndexTexture(): WebGLFramebuffer {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Initialize the color index texture.
    // This texture is used both as a render target (when indexing)
    // and as source texture (when rendering).

    // As a source texture we store the color index in texture unit 0 so we
    // call gl.activeTexture before gl.bindTexture

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
    // initialize the color index matrix with the background color
    const backgroundColor = Number(overmind.state.palette.backgroundColorId);
    const data = new Uint8Array(targetTextureHeight * targetTextureWidth * 4).fill(backgroundColor);
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

    gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

    // Create a framebuffer for rendering to this texture and store the reference.

    const colorIndexFramebuffer = gl.createFramebuffer();
    if (!colorIndexFramebuffer) {
      throw 'Failed to create framebuffer for color index';
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, colorIndexFramebuffer);

    // attach the texture as the first color attachment of the framebuffer

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

    return colorIndexFramebuffer;
  }

  private initPaletteTexture(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const paletteTexture = new Uint8Array(256 * 4);
    const palette = overmind.state.palette.paletteArray;
    for (let i = 0; i < palette.length; i++) {
      paletteTexture[i * 4 + 0] = palette[i].r;
      paletteTexture[i * 4 + 1] = palette[i].g;
      paletteTexture[i * 4 + 2] = palette[i].b;
      paletteTexture[i * 4 + 3] = 255;
    }

    // We store the palette as a source texture in texture unit 1 so we
    // call gl.activeTexture before gl.bindTexture

    gl.activeTexture(gl.TEXTURE1);

    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture);
  }

  private initVertexBuffer(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Create a common buffer object for vertex coordinates.
    // This will be used by all shaders.
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw 'Failed to create a buffer object for vertex coordinates';
    }

    // Bind the buffer object to target (this is the default)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    this.buffers.vertexBuffer = vertexBuffer;
  }

  private initTextureCoordBuffer(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Create a buffer object for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
      throw 'Failed to create the buffer object (textureCoordBuffer)';
    }

    this.buffers.textureCoordBuffer = textureCoordBuffer;
  }
}

export const paintingCanvasController = new PaintingCanvasController();
