import { Point } from '../types';
import { OvermindState } from '../overmind';

export interface Brush {
  draw(point: Point, ctx: CanvasRenderingContext2D, state: OvermindState): void;
  drawLine(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawCurve(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    middlePoint: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawDot(
    canvas: HTMLCanvasElement,
    point: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawUnfilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawFilledRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawUnfilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawFilledCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawUnfilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawFilledEllipse(
    canvas: HTMLCanvasElement,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
}
