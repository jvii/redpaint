import { Brush } from './Brush';
import { Point } from '../types';
import { OvermindState } from '../overmind';
import { colorToRGBString } from '../tools/util';
import {
  line,
  unfilledRect,
  unfilledCircle,
  filledCircle,
  filledRect,
  fillRectWithSymmetry,
  curve,
  unfilledEllipse,
  filledEllipse,
} from '../algorithm/draw';

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

    line(ctx, this, start, end, state);
  }

  public drawCurve(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    middlePoint: Point,
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

    curve(ctx, this, start, end, middlePoint, state);
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

  public drawUnfilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
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

    unfilledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle, state);
  }

  public drawFilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
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

    filledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle, state);
  }

  public draw(point: Point, ctx: CanvasRenderingContext2D, state: OvermindState): void {
    fillRectWithSymmetry(Math.floor(point.x), Math.floor(point.y), 1, 1, ctx, state);
  }

  public drawLineVertical(
    y1: number,
    y2: number,
    x: number,
    ctx: CanvasRenderingContext2D,
    state: OvermindState
  ): void {
    fillRectWithSymmetry(x, y1, 1, y2 - y1 + 1, ctx, state);
  }

  public drawLineHorizontal(
    x1: number,
    x2: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    state: OvermindState
  ): void {
    fillRectWithSymmetry(x1, y, x2 - x1 + 1, 1, ctx, state);
  }
}
