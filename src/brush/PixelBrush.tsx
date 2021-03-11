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
} from '../algorithm/shape';
import { fillRect } from '../algorithm/primitive';
import { overmind } from '..';
import { PaintingCanvasController } from '../components/canvas/PaintingCanvasController';
import { pointEquals } from '../tools/util/util';

export class PixelBrush implements BrushInterface {
  public drawDot(
    ctx: CanvasRenderingContext2D,
    point: Point,
    canvas?: PaintingCanvasController
  ): void {
    //fillRect(Math.floor(point.x), Math.floor(point.y), 1, 1, ctx);
    //dot(Math.floor(point.x), Math.floor(point.y), 1);
    //brush(Math.floor(point.x), Math.floor(point.y));
    /* if (canvas) {
      canvas.fillRect(
        Math.floor(point.x),
        Math.floor(point.y),
        1,
        1,
        overmind.state.tool.activeColorIndex
      );
    } */
    /* canvas?.fillRect(
      Math.floor(point.x),
      Math.floor(point.y),
      1,
      1,
      overmind.state.tool.activeColorIndex
    ); */
    canvas?.points([point], overmind.state.tool.activeColorIndex);
  }

  public drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: PaintingCanvasController
  ): void {
    //line(ctx, this, start, end, canvas);
    const lines = [{ p1: start, p2: end }];
    /*     if (pointEquals(start, end)) {
      canvas?.fillRect(start.x - 1, start.y, 1, 1, overmind.state.tool.activeColorIndex);
    } else {
      canvas?.lines(lines, overmind.state.tool.activeColorIndex);
    } */
    canvas?.lines(lines, overmind.state.tool.activeColorIndex);
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

  public drawFilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    filledRect(ctx, this, start, end);
  }

  public drawUnfilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    unfilledCircle(ctx, this, center, radius);
  }

  public drawFilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    filledCircle(ctx, this, center, radius);
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
