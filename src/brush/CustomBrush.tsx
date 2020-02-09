import { Brush } from './Brush';
import { Point } from '../types';
import { colorToRGBString } from '../tools/util';
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

  public drawLine(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    line(ctx, this, start, end);
  }

  public drawCurve(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    middlePoint: Point,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    curve(ctx, this, start, end, middlePoint);
  }

  public drawDot(canvas: HTMLCanvasElement, point: Point, withBackgroundColor: boolean): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    this.draw(point, ctx);
  }

  public drawUnfilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    unfilledRect(ctx, this, start, end);
  }

  public drawFilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    // DPaint just draws the filled shape as if using a pixel brush

    filledRect(ctx, this, start, end);
  }

  public drawUnfilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    unfilledCircle(ctx, this, center, radius);
  }

  public drawFilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    filledCircle(ctx, this, center, radius);
  }

  public drawUnfilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    unfilledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
  }

  public drawFilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

    filledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
  }

  public draw(point: Point, ctx: CanvasRenderingContext2D): void {
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

  public drawLineVertical(y1: number, y2: number, x: number, ctx: CanvasRenderingContext2D): void {
    let startY = y1;
    let endY = y2;

    if (y2 < y1) {
      startY = y2;
      endY = y1;
    }

    for (let y = startY; y <= endY; y++) {
      this.draw({ x: x, y: y }, ctx);
    }
  }

  public drawLineHorizontal(
    x1: number,
    x2: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    let startX = x1;
    let endX = x2;

    if (x2 < x1) {
      startX = x2;
      endX = x1;
    }

    for (let x = startX; x <= endX; x++) {
      this.draw({ x: x, y: y }, ctx);
    }
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }
}
