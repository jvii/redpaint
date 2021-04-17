import { CustomBrush } from '../brush/CustomBrush';
import { Line, Point } from '../types';

export interface CanvasController {
  attachMainCanvas(mainCanvas: HTMLCanvasElement): void;
  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void;
  points(points: Point[], colorIndex: number): void;
  lines(lines: Line[], colorIndex: number): void;
  quad?(start: Point, end: Point, colorIndex: number): void;
  drawImage?(points: Point[], brush: CustomBrush): void;
  clear(): void;
}
