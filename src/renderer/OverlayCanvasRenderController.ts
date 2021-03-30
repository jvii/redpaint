import { overmind } from '../index';
import { Line, Point } from '../types';
import { OverlayGeometricRenderer } from './renderers/OverlayGeometricRenderer';

export class OverlayCanvasRenderController {
  private gl: WebGLRenderingContext;
  private geometricRenderer: OverlayGeometricRenderer;
  //private drawImageRenderer: ColorIndexDrawImageRenderer;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
    });
    if (!gl) {
      throw 'No webgl';
    }
    this.gl = gl;

    // create renderers

    this.geometricRenderer = new OverlayGeometricRenderer(this.gl);
    //this.drawImageRenderer = new ColorIndexDrawImageRenderer(this.gl);
  }

  renderCanvas(): void {
    console.log('rendering canvas');
    //this.drawImageRenderer.renderCanvas();
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

  points(points: Point[], colorIndex: number): void {
    //console.log('rendering point, x = ', points[0].x);
    this.geometricRenderer.renderPoints(points, colorIndex);
  }

  lines(lines: Line[], colorIndex: number): void {
    console.log('rendering line, x1 = ', lines[0].p1.x, ', x2 = ', lines[0].p2.x);
    this.geometricRenderer.renderLines(lines, colorIndex);
  }

  /*   drawImage(x: number, y: number, brush: CustomBrush): void {
    this.drawImageIndexer.indexDrawImage(x, y, brush);
  } */
}
