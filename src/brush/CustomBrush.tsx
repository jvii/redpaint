import { Brush } from './Brush';
import { Color, Point } from '../types';
import { distance } from '../tools/util';

export class CustomBrush implements Brush {
  private brushImage = new Image();
  private width = 0;
  private heigth = 0;
  public constructor(dataURL: string) {
    this.brushImage.src = dataURL;
    this.brushImage.onload = (): void => {
      this.width = this.brushImage.width;
      this.heigth = this.brushImage.height;
    };
  }

  public drawLine(canvas: HTMLCanvasElement, color: Color, start: Point, end: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const startAdj = this.adjustHandle(start);
    const endAdj = this.adjustHandle(end);

    const dist = distance(startAdj, endAdj);
    for (let i = 0; i < dist; i += 1) {
      ctx.drawImage(
        this.brushImage,
        Math.floor(startAdj.x + ((endAdj.x - startAdj.x) / dist) * i),
        Math.floor(startAdj.y + ((endAdj.y - startAdj.y) / dist) * i)
      );
    }
  }

  public drawDot(canvas: HTMLCanvasElement, color: Color, point: Point): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const pointAdj = this.adjustHandle(point);
    ctx.drawImage(this.brushImage, Math.floor(pointAdj.x), Math.floor(pointAdj.y));
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - this.width / 2, y: point.y - this.heigth / 2 };
  }
}
