import { Brush } from './Brush';
import { Point } from '../types';
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
import { overmind } from '../index';

export class PixelBrush implements Brush {
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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

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

    ctx.fillStyle = colorToRGBString(
      withBackgroundColor
        ? overmind.state.palette.backgroundColor
        : overmind.state.palette.foregroundColor
    );

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
    fillRectWithSymmetry(Math.floor(point.x), Math.floor(point.y), 1, 1, ctx);
  }

  public drawLineVertical(y1: number, y2: number, x: number, ctx: CanvasRenderingContext2D): void {
    fillRectWithSymmetry(x, y1, 1, y2 - y1 + 1, ctx);
  }

  public drawLineHorizontal(
    x1: number,
    x2: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    fillRectWithSymmetry(x1, y, x2 - x1 + 1, 1, ctx);
  }
}
