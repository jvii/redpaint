import { CanvasController } from '../canvas/CanvasController';
import { Point } from '../types';

export interface BrushInterface {
  drawDot(ctx: CanvasRenderingContext2D, point: Point, canvas?: CanvasController): void;
  drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void;
  drawLineVertical(ctx: CanvasRenderingContext2D, y1: number, y2: number, x: number): void;
  drawLineHorizontal(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number): void;
  drawCurve(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    middlePoint: Point,
    canvas?: CanvasController
  ): void;
  drawUnfilledRect(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void;
  drawFilledRect(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void;
  drawUnfilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void;
  drawFilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void;
  drawUnfilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void;
  drawFilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void;
  drawUnfilledPolygon(ctx: CanvasRenderingContext2D, vertices: Point[], complete?: boolean): void;
  drawFilledPolygon(ctx: CanvasRenderingContext2D, vertices: Point[]): void;
}
