import { Brush } from './Brush';
import { Point } from '../types';
import { OvermindState } from '../overmind';
import { colorToRGBString } from '../tools/util';
import { line, unfilledRect, filledRect, unfilledCircle, filledCircle } from '../algorithm/draw';

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

    line(ctx, this, start, end, state);
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
    this.draw(point, ctx, state);
  }

  public drawUnfilledRect(
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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    unfilledRect(ctx, this, start, end, state);
  }

  public drawFilledRect(
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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    // DPaint just draws the filled shape as if using a pixel brush

    filledRect(ctx, this, start, end, state);
  }

  public drawUnfilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    unfilledCircle(ctx, this, center, radius, state);
  }

  public drawFilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    filledCircle(ctx, this, center, radius, state);
  }

  public draw(point: Point, ctx: CanvasRenderingContext2D, state: OvermindState): void {
    const pointAdj = this.adjustHandle(point);
    ctx.drawImage(this.brushImage, Math.floor(pointAdj.x), Math.floor(pointAdj.y));

    if (!state.toolbar.symmetryModeOn) {
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

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }
}
