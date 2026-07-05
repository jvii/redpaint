import { CustomBrush } from '../../brush/CustomBrush';
import { Line, PaintColor, Point } from '../../types';
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

  // The canvas element is resized when an image is loaded, which resets the
  // drawing buffer but not the GL viewport — so the viewport is refreshed
  // before every draw.
  private updateViewport(): void {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  points(points: Point[], color: PaintColor): void {
    this.updateViewport();
    this.geometricRenderer.renderPoints(points, color);
  }

  lines(lines: Line[], color: PaintColor): void {
    this.updateViewport();
    this.geometricRenderer.renderLines(lines, color);
  }

  quad(start: Point, end: Point, color: PaintColor): void {
    this.updateViewport();
    this.geometricRenderer.renderQuad(start, end, color);
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.updateViewport();
    this.drawImageRenderer.renderDrawImage(points, brush);
  }

  selectionBox(start: Point, end: Point): void {
    this.updateViewport();
    this.selectionIndicatorRenderer.renderSelectionBox(start, end);
  }

  selectionCrosshair(point: Point): void {
    this.updateViewport();
    this.selectionIndicatorRenderer.renderSelectionCrosshair(point);
  }

  renderCanvas(): void {
    //this.drawImageRenderer.renderCanvas();
  }

  clear(): void {
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}
