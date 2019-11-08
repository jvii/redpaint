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

    let dist = Math.round(distance(startAdj, endAdj));
    if (dist === 0) {
      dist = 1; // does dpaint draw a point with line tool?
    }
    for (let i = 0; i <= dist; i++) {
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
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }
}
