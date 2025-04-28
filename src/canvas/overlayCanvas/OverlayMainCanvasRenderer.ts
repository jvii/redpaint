import { CustomBrush } from '../../brush/CustomBrush';
import { Line, Point } from '../../types';
import { OverlayDrawImageRenderer } from './program/OverlayDrawImageRenderer';
import { OverlayGeometricRenderer } from './program/OverlayGeometricRenderer';
import { OverlaySelectionIndicatorRenderer } from './program/OverlaySelectionIndicatorRenderer';

type GLBuffers = {
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

export class OverlayMainCanvasRenderer {
  private gl: WebGLRenderingContext;
  private geometricRenderer: OverlayGeometricRenderer;
  private drawImageRenderer: OverlayDrawImageRenderer;
  private selectionIndicatorRenderer: OverlaySelectionIndicatorRenderer;

  constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;

    // create renderers

    this.geometricRenderer = new OverlayGeometricRenderer(gl);
    this.drawImageRenderer = new OverlayDrawImageRenderer(gl, buffers);
    this.selectionIndicatorRenderer = new OverlaySelectionIndicatorRenderer(gl);
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed
   */
  public dispose(): void {
    console.log('Disposing OverlayMainCanvasRenderer');
    if (this.geometricRenderer) {
      this.geometricRenderer.dispose();
      this.geometricRenderer = null;
    }
    if (this.drawImageRenderer) {
      this.drawImageRenderer.dispose();
      this.drawImageRenderer = null;
    }
    if (this.selectionIndicatorRenderer) {
      this.selectionIndicatorRenderer.dispose();
      this.selectionIndicatorRenderer = null;
    }
  }

  points(points: Point[], colorNumber: number): void {
    this.geometricRenderer.renderPoints(points, colorNumber);
  }

  lines(lines: Line[], colorNumber: number): void {
    this.geometricRenderer.renderLines(lines, colorNumber);
  }

  quad(start: Point, end: Point, colorNumber: number): void {
    this.geometricRenderer.renderQuad(start, end, colorNumber);
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    console.log('overlay drawimage');
    this.drawImageRenderer.renderDrawImage(points, brush);
  }

  selectionBox(start: Point, end: Point): void {
    console.log('overlay selection box');
    this.selectionIndicatorRenderer.renderSelectionBox(start, end);
  }

  selectionCrosshair(point: Point): void {
    console.log('overlay selection crosshair');
    this.selectionIndicatorRenderer.renderSelectionCrosshair(point);
  }

  renderCanvas(): void {
    console.log('rendering canvas');
    //this.drawImageRenderer.renderCanvas();
  }

  clear(): void {
    console.log('clearing overlay canvas');
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}
