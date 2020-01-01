import { Point } from '../types';
import { OvermindState } from '../overmind';

export interface Brush {
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
}
