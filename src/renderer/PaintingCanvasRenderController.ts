import { overmind } from '../index';
import { Line, Point } from '../types';
import { ColorIndexDrawImageRenderer } from './renderers/ColorIndexDrawImageRenderer';
import { colorIndexer } from '../colorIndex/ColorIndexer';
import { ColorIndexGeometricRenderer } from './renderers/ColorIndexGeometricRenderer';

export class PaintingCanvasRenderController {
  private gl: WebGLRenderingContext;
  private geometricRenderer: ColorIndexGeometricRenderer;
  private drawImageRenderer: ColorIndexDrawImageRenderer;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) {
      throw 'No webgl';
    }
    this.gl = gl;

    // create renderers

    this.geometricRenderer = new ColorIndexGeometricRenderer(this.gl);
    this.drawImageRenderer = new ColorIndexDrawImageRenderer(this.gl);
  }

  renderCanvas(): void {
    console.log('rendering canvas');
    this.drawImageRenderer.renderCanvas();
  }

  renderTo2dCanvas(targetCtx: CanvasRenderingContext2D | null): void {
    if (overmind.state.toolbox.zoomModeOn) {
      targetCtx?.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
      targetCtx?.drawImage(this.gl.canvas, 0, 0);
    }
  }

  /*   fillRect(x: number, y: number, width: number, heigth: number): void {
    this.fillRectIndexer.indexFillRect(x, y, width, heigth, colorIndex);
  }*/

  points(points: Point[]): void {
    console.log('rendering point, x = ', points[0].x);
    this.geometricRenderer.renderPoints(points);
  }

  lines(lines: Line[]): void {
    console.log('rendering line, x1 = ', lines[0].p1.x, ', x2 = ', lines[0].p2.x);
    this.geometricRenderer.renderLines(lines);
  }

  /*   drawImage(x: number, y: number, brush: CustomBrush): void {
    this.drawImageIndexer.indexDrawImage(x, y, brush);
  } */

  public initColorIndexTexture(): void {
    const gl = this.gl;

    // upload color index texture
    gl.activeTexture(gl.TEXTURE0);
    const imageTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const indexCanvas = colorIndexer.getIndexAsCanvas();
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, indexCanvas);

    // Setup palette (TODO: optimisation could be to only do this when palette has changed)

    const paletteTexture = new Uint8Array(256 * 4);
    const palette = overmind.state.palette.paletteArray;
    for (let i = 0; i < palette.length; i++) {
      paletteTexture[i * 4 + 0] = palette[i].r;
      paletteTexture[i * 4 + 1] = palette[i].g;
      paletteTexture[i * 4 + 2] = palette[i].b;
      paletteTexture[i * 4 + 3] = 255;
    }

    // make palette texture and upload palette
    gl.activeTexture(gl.TEXTURE1);
    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture);
  }
}
