import { Line, Point } from '../types';

export interface CanvasController {
  attachMainCanvas(mainCanvas: HTMLCanvasElement): void;
  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void;
  points(points: Point[], colorIndex: number): void;
  lines(lines: Line[], colorIndex: number): void;
  fillRect?(start: Point, end: Point, colorIndex: number): void;
}
