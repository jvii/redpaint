import { LineH } from '../../domain/LineH';
import { LineV } from '../../domain/LineV';
import { Line, Point } from '../../types';
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

  renderCanvas(): void {
    console.log('rendering canvas');
    this.drawImageRenderer.renderCanvas();
  }

  /*   fillRect(x: number, y: number, width: number, heigth: number): void {
    this.fillRectIndexer.indexFillRect(x, y, width, heigth, colorIndex);
  }*/

  points(points: Point[]): void {
    this.geometricRenderer.renderPoints(points);
  }

  lines(lines: (LineH | LineV)[]): void {
    this.geometricRenderer.renderLines(lines);
  }

  /*   drawImage(x: number, y: number, brush: CustomBrush): void {
    this.drawImageIndexer.indexDrawImage(x, y, brush);
  } */
}
