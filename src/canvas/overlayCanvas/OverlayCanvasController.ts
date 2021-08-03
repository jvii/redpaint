import { overmind } from '../..';
import { CustomBrush } from '../../brush/CustomBrush';
import { Line, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { ZoomCanvasRenderer } from '../ZoomCanvasRenderer';
import { OverlayMainCanvasRenderer } from './OverlayMainCanvasRenderer';

// OverlayController is a singleton responsible for controlling
// the two overlay canvases in the app for MainCanvas and ZoomCanvas.
class OverlayCanvasController implements CanvasController {
  private mainCanvasOverlay: HTMLCanvasElement = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;

  private mainCanvasRenderer: OverlayMainCanvasRenderer | null = null;
  private zoomCanvasRenderer: ZoomCanvasRenderer | null = null;

  private buffers: { vertexBuffer: WebGLBuffer | null; textureCoordBuffer: WebGLBuffer | null } = {
    vertexBuffer: null,
    textureCoordBuffer: null,
  };

  attachMainCanvas(mainCanvasOverlay: HTMLCanvasElement): void {
    this.mainCanvasOverlay = mainCanvasOverlay;

    const gl = mainCanvasOverlay.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
    });
    if (!gl) {
      throw 'No webgl';
    }
    this.gl = gl;

    this.buffers.vertexBuffer = this.initVertexBuffer();
    this.buffers.textureCoordBuffer = this.initTextureCoordBuffer();
    this.initPaletteTexture();

    this.mainCanvasRenderer = new OverlayMainCanvasRenderer(gl, {
      vertexBuffer: this.buffers.vertexBuffer,
      textureCoordBuffer: this.buffers.textureCoordBuffer,
    });
  }

  attachZoomCanvas(zoomCanvasOverlay: HTMLCanvasElement): void {
    this.zoomCanvasRenderer = new ZoomCanvasRenderer(zoomCanvasOverlay);
  }

  points(points: Point[], colorIndex: number): void {
    this.mainCanvasRenderer?.points(points, colorIndex);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }

  lines(lines: Line[], colorIndex: number): void {
    this.mainCanvasRenderer?.lines(lines, colorIndex);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }

  quad(start: Point, end: Point, colorIndex: number): void {
    this.mainCanvasRenderer?.quad(start, end, colorIndex);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.mainCanvasRenderer?.drawImage(points, brush);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }

  selectionBox(start: Point, end: Point): void {
    this.mainCanvasRenderer?.selectionBox(start, end);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }

  selectionCrosshair(point: Point): void {
    this.mainCanvasRenderer?.selectionCrosshair(point);
    this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
  }
  /*

  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    this.zoomCanvasRenderer?.renderCanvas();
  } */

  clear(): void {
    this.mainCanvasRenderer?.clear();
    this.zoomCanvasRenderer?.clear();
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

export const overlayCanvasController = new OverlayCanvasController();
