import { CustomBrush } from '../brush/CustomBrush';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import { Point } from '../types';

export interface CanvasController {
  attachMainCanvas(mainCanvas: HTMLCanvasElement): void;
  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void;
  points(points: Point[], colorIndex: number): void;
  lines(lines: (LineH | LineV)[], colorIndex: number): void;
  quad?(start: Point, end: Point, colorIndex: number): void;
  drawImage?(points: Point[], brush: CustomBrush): void;
  clear(): void;
}
