import { overmind } from '../..';
import { CustomBrush } from '../../brush/CustomBrush';
import { PaintColor, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { ColorIndexer } from './ColorIndexer';
import { MainCanvasRenderer } from './MainCanvasRenderer';
import { ZoomCanvasRenderer } from '../ZoomCanvasRenderer';
import { LineV } from '../../domain/LineV';
import { LineH } from '../../domain/LineH';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import { BrushColorIndex } from '../../domain/BrushColorIndex';

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
      alpha: false,
    });
    if (!gl) {
      throw new Error('No WebGL context available');
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

  // Rebuilds all GL state after a webglcontextlost/webglcontextrestored
  // cycle: every program, buffer and texture from before the loss is
  // invalid, so run the full attach + texture setup again on the restored
  // context (getContext returns the same, now-restored context object).
  // Unlike init(), no new undo point is set — the caller repaints the
  // committed pixels from the undo buffer's current snapshot instead.
  restoreContext(): void {
    this.attachMainCanvas(this.mainCanvas);
    this.initColorIndexTexture();
    this.initPaletteTexture();
  }

  init(): void {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No WebGL context available, call attachMainCanvas() first');
    }

    // color index texture always in texture unit 0
    // palette texture always in texture unit 1
    // brush texture always in texture unit 2

    this.initColorIndexTexture();
    this.initPaletteTexture();

    // No undo point here: whether the freshly initialized (empty) canvas is a
    // history entry is the caller's call — see setResolution's recordUndoPoint.
    // Recording one unconditionally used to plant blank artifact entries in
    // the middle of content-preserving resizes and image loads.
  }

  points(points: Point[], color: PaintColor): void {
    this.colorIndexer?.points(points, color);
    this.mainCanvasRenderer?.points(points);
    this.renderZoomCanvas();
  }

  lines(lines: (LineH | LineV)[], color: PaintColor): void {
    this.colorIndexer?.lines(lines, color);
    this.mainCanvasRenderer?.lines(lines);
    this.renderZoomCanvas();
  }

  quad(start: Point, end: Point, color: PaintColor): void {
    this.colorIndexer?.quad(start, end, color);
    this.mainCanvasRenderer?.renderCanvas(); // TODO: renderQuad?
    this.renderZoomCanvas();
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.colorIndexer?.drawImage(points, brush);
    this.mainCanvasRenderer?.renderCanvas(); // TODO: renderDrawImage?
    this.renderZoomCanvas();
  }

  effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    // wired to ColorIndexer/EffectIndexer in the next task
  }

  endEffectStroke(): void {}

  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    this.renderZoomCanvas();
  }

  // Copying the canvas into the zoom view costs a full-canvas blit per draw
  // call, so skip it while the zoom view is hidden. useRefreshZoomCanvas
  // re-renders when zoom mode is turned on.
  private renderZoomCanvas(): void {
    if (overmind.state.toolbox.zoomModeOn) {
      this.zoomCanvasRenderer?.render(this.mainCanvas);
    }
  }

  clear(): void {
    this.initColorIndexTexture();
    this.render();
  }

  getCanvasColorIndex(): CanvasColorIndex | undefined {
    return this.colorIndexer?.getIndex();
  }

  getPaintColorForPoint(point: Point): PaintColor | undefined {
    const colorIndex = this.colorIndexer?.getIndex();
    return colorIndex?.getPaintColorForPixel(point);
  }

  getBrushColorIndexFromArea(
    start: Point, // canvas coord (origin upper left corner)
    width: number, // canvas coord, can be negative
    height: number // canvas coord, can be negative
  ): BrushColorIndex | null {
    const brushColorIndexArray = this.colorIndexer?.getAreaFromIndex(
      start.x,
      start.y,
      width,
      height
    );
    if (!brushColorIndexArray) {
      return null;
    }
    return new BrushColorIndex(
      width,
      height,
      brushColorIndexArray,
      Number(overmind.state.palette.backgroundColorId)
    );
  }

  setCanvasColorIndex(colorIndex: CanvasColorIndex): void {
    this.colorIndexer?.setIndex(colorIndex);
  }

  // testing, debugging purposes only
  visualiseIndex(): void {
    this.colorIndexer?.visualiseIndex();
  }

  updatePalette(): void {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No WebGL context available');
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
      throw new Error('No WebGL context available');
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
    // Create an empty color index with the background color
    const backgroundColor = Number(overmind.state.palette.backgroundColorId);
    const canvasColorIndex = CanvasColorIndex.createEmptyWithBackgroundColor(
      targetTextureWidth,
      targetTextureHeight,
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
      canvasColorIndex.indexArray
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
      throw new Error('No WebGL context available');
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
      throw new Error('No WebGL context available');
    }
    // Create a framebuffer for rendering to this texture and store the reference.

    const fb = gl.createFramebuffer();
    if (!fb) {
      throw new Error('Failed to create framebuffer for color index');
    }
    return fb;
  }

  private initVertexBuffer(): WebGLBuffer {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No WebGL context available');
    }

    // Create a common buffer object for vertex coordinates.
    // This will be used by all shaders.
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error('Failed to create a buffer object for vertex coordinates');
    }

    // Bind the buffer object to target (this is the default)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    return vertexBuffer;
  }

  private initTextureCoordBuffer(): WebGLBuffer {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No WebGL context available');
    }

    // Create a buffer object for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
      throw new Error('Failed to create the buffer object (textureCoordBuffer)');
    }

    return textureCoordBuffer;
  }

  /**
   * Cleans up WebGL resources for the main canvas
   */
  public disposeMainCanvas(): void {
    if (this.mainCanvasRenderer) {
      this.mainCanvasRenderer.dispose();
      this.mainCanvasRenderer = null;
    }
    if (this.colorIndexer) {
      this.colorIndexer.dispose();
      this.colorIndexer = null;
    }
    // Clean up buffers
    if (this.gl) {
      if (this.buffers.vertexBuffer) {
        this.gl.deleteBuffer(this.buffers.vertexBuffer);
        this.buffers.vertexBuffer = null;
      }
      if (this.buffers.textureCoordBuffer) {
        this.gl.deleteBuffer(this.buffers.textureCoordBuffer);
        this.buffers.textureCoordBuffer = null;
      }
      if (this.buffers.colorIndexFramebuffer) {
        this.gl.deleteFramebuffer(this.buffers.colorIndexFramebuffer);
        this.buffers.colorIndexFramebuffer = null;
      }
    }
  }

  /**
   * Cleans up WebGL resources for the zoom canvas
   */
  public disposeZoomCanvas(): void {
    // Currently no WebGL resources to clean up for zoom canvas
    // as it uses 2D context instead of WebGL
  }
}

export const paintingCanvasController = new PaintingCanvasController();
