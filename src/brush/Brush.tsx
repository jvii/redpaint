import { Point } from '../types';

export interface Brush {
  drawLine(canvas: HTMLCanvasElement, start: Point, end: Point, withBackgroundColor: boolean): void;
  drawCurve(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    middlePoint: Point,
    withBackgroundColor: boolean
  ): void;
  drawDot(canvas: HTMLCanvasElement, point: Point, withBackgroundColor: boolean): void;
  drawUnfilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean
  ): void;
  drawFilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean
  ): void;
  drawUnfilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean
  ): void;
  drawFilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean
  ): void;
  drawUnfilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean
  ): void;
  drawFilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean
  ): void;

  // Used with context

  draw(point: Point, ctx: CanvasRenderingContext2D): void;
  drawLineVertical(y1: number, y2: number, x: number, ctx: CanvasRenderingContext2D): void;
  drawLineHorizontal(x1: number, x2: number, y: number, ctx: CanvasRenderingContext2D): void;
}
