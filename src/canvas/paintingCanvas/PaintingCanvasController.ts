import { overmind } from '../..';
import { CustomBrush } from '../../brush/CustomBrush';
import { Line, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { ColorIndexer } from './ColorIndexer';
import { MainCanvasRenderer } from './MainCanvasRenderer';
import { ZoomCanvasRenderer } from '../ZoomCanvasRenderer';
import { LineV } from '../../domain/LineV';
import { LineH } from '../../domain/LineH';

type GLBuffers = {
  colorIndexFramebuffer: WebGLFramebuffer | null;
  vertexBuffer: WebGLBuffer | null;
  textureCoordBuffer: WebGLBuffer | null;
};

// PaintingCanvasController is a singleton responsible for controlling
// the two painting canvases in the app: MainCanvas and ZoomCanvas.
// Note that overlay canvases are controlled separately by OverlayCanvasController.
export class PaintingCanvasController implements CanvasController {
  public mainCanvas: HTMLCanvasElement = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;

  private colorIndexer: ColorIndexer | null = null;
  private mainCanvasRenderer: MainCanvasRenderer | null = null;
  private zoomCanvasRenderer: ZoomCanvasRenderer | null = null;

  private buffers: GLBuffers = {
    colorIndexFramebuffer: null,
    vertexBuffer: null,
    textureCoordBuffer: null,
  };

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

    this.buffers.vertexBuffer = this.initVertexBuffer();
    this.buffers.textureCoordBuffer = this.initTextureCoordBuffer();
    this.buffers.colorIndexFramebuffer = this.initColorIndexFramebuffer();

    this.colorIndexer = new ColorIndexer(gl, {
      colorIndexFramebuffer: this.buffers.colorIndexFramebuffer,
      vertexBuffer: this.buffers.vertexBuffer,
      textureCoordBuffer: this.buffers.textureCoordBuffer,
    });
    this.mainCanvasRenderer = new MainCanvasRenderer(gl);
  }

  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void {
    this.zoomCanvasRenderer = new ZoomCanvasRenderer(zoomCanvas);
  }

  init(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl, call attachMainCanvas() first.';
    }

    // color index texture always in texture unit 0
    // palette texture always in texture unit 1
    // brush texture always in texture unit 2

    this.initColorIndexTexture();
    this.initPaletteTexture();

    overmind.actions.undo.setUndoPoint(); // initial undo point
  }

  points(points: Point[], colorIndex: number): void {
    this.colorIndexer?.points(points, colorIndex);
    this.mainCanvasRenderer?.points(points);
    this.zoomCanvasRenderer?.render(this.mainCanvas);
  }

  lines(lines: (LineH | LineV)[], colorIndex: number): void {
    this.colorIndexer?.lines(lines, colorIndex);
    this.mainCanvasRenderer?.lines(lines);
    this.zoomCanvasRenderer?.render(this.mainCanvas);
  }

  quad(start: Point, end: Point, colorIndex: number): void {
    this.colorIndexer?.quad(start, end, colorIndex);
    this.mainCanvasRenderer?.renderCanvas(); // TODO: renderQuad?
    this.zoomCanvasRenderer?.render(this.mainCanvas);
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.colorIndexer?.drawImage(points, brush);
    this.mainCanvasRenderer?.renderCanvas(); // TODO: renderDrawImage?
    this.zoomCanvasRenderer?.render(this.mainCanvas);
    //this.visualiseIndex();
  }

  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    this.zoomCanvasRenderer?.render(this.mainCanvas);
  }

  clear(): void {
    this.initColorIndexTexture();
    this.render();
  }

  getIndex(): Uint8Array | undefined {
    return this.colorIndexer?.getIndex();
  }

  setIndex(colorIndex: Uint8Array): void {
    this.colorIndexer?.setIndex(colorIndex);
  }

  getAreaFromIndex(
    x: number, // canvas coord (origin upper left corner)
    y: number, // canvas coord (origin upper left corner)
    width: number, // canvas coord, can be negative
    height: number // canvas coord, can be negative
  ): Uint8Array | undefined {
    return this.colorIndexer?.getAreaFromIndex(x, y, width, height);
  }

  // testing, debugging purposes only
  visualiseIndex(): void {
    this.colorIndexer?.visualiseIndex();
  }

  updatePalette(): void {
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
    gl.activeTexture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture);

    this.render();
  }

  private initColorIndexTexture(): void {
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

    // attach the texture as the first color attachment of the framebuffer

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
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

  private initColorIndexFramebuffer(): WebGLFramebuffer {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }
    // Create a framebuffer for rendering to this texture and store the reference.

    const fb = gl.createFramebuffer();
    if (!fb) {
      throw 'Failed to create framebuffer for color index';
    }
    return fb;
  }

  private initVertexBuffer(): WebGLBuffer {
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

    return vertexBuffer;
  }

  private initTextureCoordBuffer(): WebGLBuffer {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Create a buffer object for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
      throw 'Failed to create the buffer object (textureCoordBuffer)';
    }

    return textureCoordBuffer;
  }
}

export const paintingCanvasController = new PaintingCanvasController();
