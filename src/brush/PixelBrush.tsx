import { BrushInterface } from './Brush';
import { Point } from '../types';
import {
  line,
  unfilledRect,
  unfilledCircle,
  filledCircle,
  filledRect,
  curve,
  unfilledEllipse,
  filledEllipse,
  filledPolygon,
  unfilledPolygon,
  filledCircle2,
  unfilledCircle2,
  line2,
} from '../algorithm/shape';
import { fillRect } from '../algorithm/primitive';
import { overmind } from '..';
import { pointEquals } from '../tools/util/util';
import { CanvasController } from '../canvas/CanvasController';

export class PixelBrush implements BrushInterface {
  public drawDot(ctx: CanvasRenderingContext2D, point: Point, canvas?: CanvasController): void {
    canvas?.points([point], overmind.state.tool.activeColorIndex);
    //fillRect(point.x, point.y, 1, 1, ctx);
  }

  public drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void {
    //const lines = [{ p1: start, p2: end }];
    //canvas?.lines?.(lines, overmind.state.tool.activeColorIndex);
    //line(ctx, this, start, end, canvas);
    const line = line2(start, end);
    canvas?.points(line, overmind.state.tool.activeColorIndex);
  }

  public drawLineVertical(ctx: CanvasRenderingContext2D, y1: number, y2: number, x: number): void {
    fillRect(x, y1, 1, y2 - y1 + 1, ctx);
  }

  public drawLineHorizontal(
    ctx: CanvasRenderingContext2D,
    x1: number,
    x2: number,
    y: number
  ): void {
    fillRect(x1, y, x2 - x1 + 1, 1, ctx);
  }

  public drawCurve(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    middlePoint: Point
  ): void {
    curve(ctx, this, start, end, middlePoint);
  }

  public drawUnfilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    unfilledRect(ctx, this, start, end);
  }

  public drawFilledRect(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas: CanvasController
  ): void {
    //filledRect(ctx, this, start, end);
    canvas?.fillRect?.(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void {
    const unfilledCircle = unfilledCircle2(center, radius);
    canvas?.points(unfilledCircle, overmind.state.tool.activeColorIndex);
    //unfilledCircle(ctx, this, center, radius);
  }

  public drawFilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void {
    const filledCircle = filledCircle2(center, radius);
    canvas?.lines(filledCircle, overmind.state.tool.activeColorIndex);
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

  public drawUnfilledPolygon(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    complete?: boolean
  ): void {
    unfilledPolygon(ctx, this, vertices, complete);
  }

  public drawFilledPolygon(ctx: CanvasRenderingContext2D, vertices: Point[]): void {
    filledPolygon(ctx, this, vertices);
  }
}
