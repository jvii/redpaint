import { Brush } from './Brush';
import { Color, Point } from '../types';
import { colorToRGBString, distance } from '../tools/util';

export class PixelBrush implements Brush {
  public drawLine(canvas: HTMLCanvasElement, color: Color, start: Point, end: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = colorToRGBString(color);
    const dist = distance(start, end);
    for (let i = 0; i < dist; i++) {
      ctx.fillRect(
        Math.floor(start.x + ((end.x - start.x) / dist) * i), // round to avoid anti-aliasing
        Math.floor(start.y + ((end.y - start.y) / dist) * i),
        1,
        1
      );
    }
  }

  public drawDot(canvas: HTMLCanvasElement, color: Color, point: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = colorToRGBString(color);
    ctx.fillRect(Math.floor(point.x), Math.floor(point.y), 1, 1);
  }
}
