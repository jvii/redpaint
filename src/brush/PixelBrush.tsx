import { Brush } from './Brush';
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
//import { dot, brush } from '../colorIndex/ColorIndexer';

export class PixelBrush implements Brush {
  public drawDot(ctx: CanvasRenderingContext2D, point: Point): void {
    fillRect(Math.floor(point.x), Math.floor(point.y), 1, 1, ctx);
    //dot(Math.floor(point.x), Math.floor(point.y), 1);
    //brush(Math.floor(point.x), Math.floor(point.y));
  }

  public drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    line(ctx, this, start, end);
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
