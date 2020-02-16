import { Brush } from './Brush';
import { Point } from '../types';
import {
  line,
  unfilledRect,
  filledRect,
  unfilledCircle,
  filledCircle,
  curve,
  unfilledEllipse,
  filledEllipse,
} from '../algorithm/draw';
import { overmind } from '../index';

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

  public drawDot(ctx: CanvasRenderingContext2D, point: Point): void {
    const pointAdj = this.adjustHandle(point);
    ctx.drawImage(this.brushImage, Math.floor(pointAdj.x), Math.floor(pointAdj.y));

    if (!overmind.state.toolbar.symmetryModeOn) {
      return;
    }

    const originOfSymmetry: Point = {
      x: Math.round(ctx.canvas.width / 2),
      y: Math.round(ctx.canvas.height / 2),
    };

    // mirror x and y
    const sym1 = {
      x: originOfSymmetry.x + originOfSymmetry.x - pointAdj.x,
      y: originOfSymmetry.y + originOfSymmetry.y - pointAdj.y,
    };

    // mirror x
    const sym2 = {
      x: originOfSymmetry.x + originOfSymmetry.x - pointAdj.x,
      y: pointAdj.y,
    };

    // mirror y
    const sym3 = {
      x: pointAdj.x,
      y: originOfSymmetry.y + originOfSymmetry.y - pointAdj.y,
    };

    ctx.drawImage(this.brushImage, Math.floor(sym1.x), Math.floor(sym1.y));
    ctx.drawImage(this.brushImage, Math.floor(sym2.x), Math.floor(sym2.y));
    ctx.drawImage(this.brushImage, Math.floor(sym3.x), Math.floor(sym3.y));
  }

  public drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    line(ctx, this, start, end);
  }

  public drawCurve(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    middlePoint: Point
  ): void {
    curve(ctx, this, start, end, middlePoint);
  }

  public drawLineVertical(ctx: CanvasRenderingContext2D, y1: number, y2: number, x: number): void {
    let startY = y1;
    let endY = y2;

    if (y2 < y1) {
      startY = y2;
      endY = y1;
    }

    for (let y = startY; y <= endY; y++) {
      this.drawDot(ctx, { x: x, y: y });
    }
  }

  public drawLineHorizontal(
    ctx: CanvasRenderingContext2D,
    x1: number,
    x2: number,
    y: number
  ): void {
    let startX = x1;
    let endX = x2;

    if (x2 < x1) {
      startX = x2;
      endX = x1;
    }

    for (let x = startX; x <= endX; x++) {
      this.drawDot(ctx, { x: x, y: y });
    }
  }

  public drawUnfilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    unfilledRect(ctx, this, start, end);
  }

  public drawFilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    // DPaint just draws the filled shape as if using a pixel brush
    filledRect(ctx, this, start, end);
  }

  public drawUnfilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    unfilledCircle(ctx, this, center, radius);
  }

  public drawFilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    filledCircle(ctx, this, center, radius);
  }

  public drawUnfilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void {
    unfilledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
  }

  public drawFilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void {
    filledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }
}
