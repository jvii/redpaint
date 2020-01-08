import { Brush } from './Brush';
import { Point } from '../types';
import { OvermindState } from '../overmind';
import { colorToRGBString, distance } from '../tools/util';
import { unfilledCircle, filledCircle } from '../algorithm/draw';

export class PixelBrush implements Brush {
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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    let dist = Math.round(distance(start, end));
    if (dist === 0) {
      dist = 1; // draws a dot
    }
    for (let i = 0; i <= dist; i++) {
      this.draw(
        {
          x: start.x + ((end.x - start.x) / dist) * i,
          y: start.y + ((end.y - start.y) / dist) * i,
        },
        ctx,
        state
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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    this.draw(point, ctx, state);
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
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (start === end) {
      // just draw a dot
      this.drawDot(canvas, start, withBackgroundColor, state);
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    const width = end.x - start.x;
    const height = end.y - start.y;
    ctx.fillRect(start.x, start.y, width, height);
  }

  public drawCircle(
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

    if (radius === 0) {
      // just draw a dot
      this.drawDot(canvas, center, withBackgroundColor, state);
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    unfilledCircle(ctx, this, center, radius, state);
  }

  public drawCircleFilled(
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

    if (radius === 0) {
      // just draw a dot
      this.drawDot(canvas, center, withBackgroundColor, state);
      return;
    }

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor ? state.palette.backgroundColor : state.palette.foregroundColor
    );

    filledCircle(ctx, center, radius);
  }

  public draw(point: Point, ctx: CanvasRenderingContext2D, state: OvermindState): void {
    ctx.fillRect(Math.floor(point.x), Math.floor(point.y), 1, 1);

    if (!state.toolbar.symmetryModeOn) {
      return;
    }

    const originOfSymmetry: Point = {
      x: Math.round(ctx.canvas.width / 2),
      y: Math.round(ctx.canvas.height / 2),
    };

    // mirror x and y
    const sym1 = {
      x: originOfSymmetry.x + originOfSymmetry.x - point.x,
      y: originOfSymmetry.y + originOfSymmetry.y - point.y,
    };

    // mirror x
    const sym2 = {
      x: originOfSymmetry.x + originOfSymmetry.x - point.x,
      y: point.y,
    };

    // mirror y
    const sym3 = {
      x: point.x,
      y: originOfSymmetry.y + originOfSymmetry.y - point.y,
    };

    ctx.fillRect(Math.floor(sym1.x), Math.floor(sym1.y), 1, 1);
    ctx.fillRect(Math.floor(sym2.x), Math.floor(sym2.y), 1, 1);
    ctx.fillRect(Math.floor(sym3.x), Math.floor(sym3.y), 1, 1);
  }
}
