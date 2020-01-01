import { Brush } from './Brush';
import { Point } from '../types';
import { OvermindState } from '../overmind';
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

  public drawLine(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const startAdj = this.adjustHandle(start);
    const endAdj = this.adjustHandle(end);

    let dist = Math.round(distance(startAdj, endAdj));
    if (dist === 0) {
      dist = 1; // draws a dot
    }
    for (let i = 0; i <= dist; i++) {
      ctx.drawImage(
        this.brushImage,
        Math.floor(startAdj.x + ((endAdj.x - startAdj.x) / dist) * i),
        Math.floor(startAdj.y + ((endAdj.y - startAdj.y) / dist) * i)
      );
    }
  }

  public drawDot(
    canvas: HTMLCanvasElement,
    point: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const pointAdj = this.adjustHandle(point);
    ctx.drawImage(this.brushImage, Math.floor(pointAdj.x), Math.floor(pointAdj.y));
  }

  public drawRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    if (start === end) {
      // just draw a dot
      this.drawDot(canvas, start, withBackgroundColor, state);
      return;
    }

    // calculate rectangle corner points

    const point1 = start;
    const point2 = { x: end.x, y: start.y };
    const point3 = end;
    const point4 = { x: start.x, y: end.y };

    // draw lines

    this.drawLine(canvas, point1, point2, withBackgroundColor, state);
    this.drawLine(canvas, point2, point3, withBackgroundColor, state);
    this.drawLine(canvas, point3, point4, withBackgroundColor, state);
    this.drawLine(canvas, point4, point1, withBackgroundColor, state);
  }

  public drawRectFilled(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    //TODO: What actually happens here in dpaint?
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }
}
