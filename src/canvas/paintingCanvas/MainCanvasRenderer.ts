import { LineH } from '../../domain/LineH';
import { LineV } from '../../domain/LineV';
import { Point } from '../../types';
import { DrawImageRenderer } from './program/DrawImageRenderer';
import { GeometricRenderer } from './program/GeometricRenderer';

export class MainCanvasRenderer {
  private gl: WebGLRenderingContext;
  private geometricRenderer: GeometricRenderer;
  private drawImageRenderer: DrawImageRenderer;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    // create renderers

    this.geometricRenderer = new GeometricRenderer(gl);
    this.drawImageRenderer = new DrawImageRenderer(gl);
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed
   */
  public dispose(): void {
    if (this.geometricRenderer) {
      this.geometricRenderer.dispose();
      this.geometricRenderer = null;
    }
    if (this.drawImageRenderer) {
      this.drawImageRenderer.dispose();
      this.drawImageRenderer = null;
    }
  }

  renderCanvas(): void {
    this.drawImageRenderer.renderCanvas();
  }

  points(points: Point[]): void {
    this.geometricRenderer.renderPoints(points);
  }

  lines(lines: (LineH | LineV)[]): void {
    this.geometricRenderer.renderLines(lines);
  }

}
