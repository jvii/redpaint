import { CustomBrush } from '../brush/CustomBrush';
import { ColorIndexer } from '../colorIndex/ColorIndexer';
import { PaintingCanvasRenderController } from '../renderer/PaintingCanvasRenderController';
import { Line, Point } from '../types';
import { CanvasController } from './CanvasController';

// PaintingCanvasController is a singleton responsible for controlling
// the two painting canvases in the app: MainCanvas and ZoomCanvas.
// Note that overlay canvases are controllod separately by OverlayCanvasController.
class PaintingCanvasController implements CanvasController {
  private mainCanvas: HTMLCanvasElement;
  private zoomCanvas: HTMLCanvasElement;
  private zoomCanvasCtx: CanvasRenderingContext2D | null = null;
  private mainCanvasRenderer: PaintingCanvasRenderController | null = null;
  public colorIndexer: ColorIndexer | null = null;
  //private zoomCanvasRenderer: PaintingCanvasRenderController | null = null;

  constructor() {
    this.mainCanvas = document.createElement('canvas');
    this.zoomCanvas = document.createElement('canvas');
  }

  attachMainCanvas(mainCanvas: HTMLCanvasElement): void {
    this.mainCanvas = mainCanvas;
    this.mainCanvasRenderer = new PaintingCanvasRenderController(mainCanvas);
    //this.mainCanvasRenderer.initColorIndexTexture();
    this.colorIndexer = new ColorIndexer();
    this.mainCanvasRenderer.initColorIndexTexture();
  }

  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void {
    this.zoomCanvas = zoomCanvas;
    this.zoomCanvasCtx = zoomCanvas.getContext('2d', {
      alpha: true,
      desynchronized: false,
    });
    //this.zoomCanvasRenderer = new PaintingCanvasRenderController(zoomCanvas);
    //this.zoomCanvasRenderer.initColorIndexTexture();
  }

  fillRect(start: Point, end: Point, colorIndex: number): void {
    this.colorIndexer?.fillRect(start, end, colorIndex);
    console.log('fillrect');
    this.render();
  }

  points(points: Point[], colorIndex: number): void {
    this.colorIndexer?.points(points, colorIndex);
    this.mainCanvasRenderer?.points(points);
    this.mainCanvasRenderer?.renderTo2dCanvas(this.zoomCanvasCtx);
    //this.zoomCanvasRenderer?.points(points);
    //this.render();
  }

  lines(lines: Line[], colorIndex: number): void {
    this.colorIndexer?.lines(lines, colorIndex);
    this.mainCanvasRenderer?.lines(lines);
    this.mainCanvasRenderer?.renderTo2dCanvas(this.zoomCanvasCtx);
    //this.zoomCanvasRenderer?.lines(lines);
    //this.render();
  }

  drawImage(x: number, y: number, brush: CustomBrush): void {
    this.colorIndexer?.drawImage(x, y, brush);
    this.render();
  }
  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    //this.zoomCanvasRenderer?.renderCanvas();
    //const zoomCtx = this.zoomCanvas.getContext('2d');
    //zoomCtx?.drawImage(this.mainCanvas, 0, 0);
    //console.log('rendering in PaintingCanvas');
    // overmind canvasmodified
  }

  initColorIndexRenderer(): void {
    this.mainCanvasRenderer?.initColorIndexTexture();
    //this.zoomCanvasRenderer?.initColorIndexTexture();
  }
}

export const paintingCanvasController = new PaintingCanvasController();
