import { Point, Color } from '../types';

export interface Brush {
  drawLine(canvas: HTMLCanvasElement, color: Color, start: Point, end: Point): void;
  drawDot(canvas: HTMLCanvasElement, color: Color, point: Point): void;
}
