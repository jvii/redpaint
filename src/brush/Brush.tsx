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
  drawDot(
    canvas: HTMLCanvasElement,
    point: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawRect(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawRectFilled(
    canvas: HTMLCanvasElement,
    start: Point,
    end: Point,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawCircle(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
  drawCircleFilled(
    canvas: HTMLCanvasElement,
    center: Point,
    radius: number,
    withBackgroundColor: boolean,
    state: OvermindState
  ): void;
}
