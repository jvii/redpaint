import { CustomBrush } from '../../brush/CustomBrush';
import { ColorIndexRendererClass } from '../../colorIndex/renderer/ColorIndexRendererClass';
import { Line, Point } from '../../types';
import { colorIndexer } from './ColorIndexerClass';
//import { ColorIndexerClass } from './ColorIndexerClass';

// PaintingCanvasController is a singleton class responsible for controlling
// the two painting canvases in the app: MainCanvas and ZoomCanvas.
// Note that overlay canvases are controllod separately by OverlayCanvasController.
export class PaintingCanvasController {
  //private colorIndexer: ColorIndexerClass; // can be located here later
  private mainCanvas: HTMLCanvasElement;
  private zoomCanvas: HTMLCanvasElement;
  private mainCanvasRenderer: ColorIndexRendererClass | null = null;
  private zoomCanvasRenderer: ColorIndexRendererClass | null = null;

  constructor() {
    //this.colorIndexer = new ColorIndexerClass();
    this.mainCanvas = document.createElement('canvas');
    this.zoomCanvas = document.createElement('canvas');
  }

  attachMainCanvas(mainCanvas: HTMLCanvasElement): void {
    this.mainCanvas = mainCanvas;
    this.mainCanvasRenderer = new ColorIndexRendererClass(mainCanvas);
    this.mainCanvasRenderer.initColorIndexTexture();
  }

  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void {
    this.zoomCanvas = zoomCanvas;
    this.zoomCanvasRenderer = new ColorIndexRendererClass(zoomCanvas);
    this.zoomCanvasRenderer.initColorIndexTexture();
  }

  fillRect(x: number, y: number, width: number, heigth: number, colorIndex: number): void {
    colorIndexer.fillRect(x, y, width, heigth, colorIndex);
    console.log('fillrect');
    //this.render();
  }

  points(points: Point[], colorIndex: number): void {
    const shiftedPoints = [{ x: points[0].x + 0.5, y: points[0].y + 0.5 }];
    colorIndexer.points(shiftedPoints, colorIndex);
    this.mainCanvasRenderer?.points(shiftedPoints);
    this.zoomCanvasRenderer?.points(shiftedPoints);
    //this.render();
  }

  lines(lines: Line[], colorIndex: number): void {
    const p1XSmaller = lines[0].p1.x < lines[0].p2.x;
    const p1YSmaller = lines[0].p1.y < lines[0].p2.y;
    const shiftedLines = [
      {
        p1: { x: lines[0].p1.x + 0.5, y: lines[0].p1.y + 0.5 },
        p2: {
          x: lines[0].p2.x + (p1XSmaller ? 1.5 : 0),
          y: lines[0].p2.y + (p1YSmaller ? 1.5 : 0),
        },
      },
    ];
    colorIndexer.lines(shiftedLines, colorIndex);
    this.mainCanvasRenderer?.lines(shiftedLines);
    this.zoomCanvasRenderer?.lines(shiftedLines);
    //this.render();
  }

  drawImage(x: number, y: number, brush: CustomBrush): void {
    colorIndexer.drawImage(x, y, brush);
    this.render();
  }

  render(): void {
    this.mainCanvasRenderer?.renderCanvas();
    this.zoomCanvasRenderer?.renderCanvas();
    //const zoomCtx = this.zoomCanvas.getContext('2d');
    //zoomCtx?.drawImage(this.mainCanvas, 0, 0);
    //console.log('rendering in PaintingCanvas');
    // overmind canvasmodified
  }

  initColorIndexRenderer(): void {
    this.mainCanvasRenderer?.initColorIndexTexture();
    this.zoomCanvasRenderer?.initColorIndexTexture();
  }
}

export const paintingCanvasController = new PaintingCanvasController();
