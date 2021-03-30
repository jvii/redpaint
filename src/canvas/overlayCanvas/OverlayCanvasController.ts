import { CustomBrush } from '../../brush/CustomBrush';
import { Line, Point } from '../../types';
import { OverlayCanvasRenderController } from '../../renderer/OverlayCanvasRenderController';
import { CanvasController } from '../CanvasController';

// OverlayController is a singleton responsible for controlling
// the two overlay canvases in the app for MainCanvas and ZoomCanvas.
class OverlayController implements CanvasController {
  private mainCanvasOverlay: HTMLCanvasElement;
  private zoomCanvasOverlay: HTMLCanvasElement;
  private zoomCanvasOverlayCtx: CanvasRenderingContext2D | null = null;
  private mainCanvasOverlayRenderer: OverlayCanvasRenderController | null = null;
  //private zoomCanvasOverlayRenderer: OverlayCanvasRenderController | null = null;

  constructor() {
    this.mainCanvasOverlay = document.createElement('canvas');
    this.zoomCanvasOverlay = document.createElement('canvas');
  }

  attachMainCanvas(mainCanvasOverlay: HTMLCanvasElement): void {
    this.mainCanvasOverlay = mainCanvasOverlay;
    this.mainCanvasOverlayRenderer = new OverlayCanvasRenderController(mainCanvasOverlay);
  }

  attachZoomCanvas(zoomCanvasOverlay: HTMLCanvasElement): void {
    this.zoomCanvasOverlay = zoomCanvasOverlay;
    this.zoomCanvasOverlayCtx = zoomCanvasOverlay.getContext('2d', {
      alpha: true,
      desynchronized: false,
    });
    //this.zoomCanvasOverlayRenderer = new OverlayCanvasRenderController(zoomCanvasOverlay);
  }

  /*   fillRect(x: number, y: number, width: number, heigth: number, colorIndex: number): void {
    colorIndexer.fillRect(x, y, width, heigth, colorIndex);
    console.log('fillrect');
    //this.render();
  } */

  points(points: Point[], colorIndex: number): void {
    this.mainCanvasOverlayRenderer?.points(points, colorIndex);
    this.mainCanvasOverlayRenderer?.renderTo2dCanvas(this.zoomCanvasOverlayCtx);
    //this.zoomCanvasOverlayRenderer?.points(points, colorIndex);
    //this.render();
  }

  lines(lines: Line[], colorIndex: number): void {
    this.mainCanvasOverlayRenderer?.lines(lines, colorIndex);
    this.mainCanvasOverlayRenderer?.renderTo2dCanvas(this.zoomCanvasOverlayCtx);
    //this.zoomCanvasOverlayRenderer?.lines(lines, colorIndex);
    //this.render();
  }

  /*   drawImage(x: number, y: number, brush: CustomBrush): void {
    colorIndexer.drawImage(x, y, brush);
    this.render();
  }

  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    this.zoomCanvasRenderer?.renderCanvas();
  } */
}

export const overlayCanvasController = new OverlayController();
