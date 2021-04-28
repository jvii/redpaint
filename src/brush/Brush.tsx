import { CanvasController } from '../canvas/CanvasController';
import { Point } from '../types';

export interface BrushInterface {
  drawPoint(ctx: CanvasRenderingContext2D, point: Point, canvas?: CanvasController): void;
  drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void;
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
    rotationAngle: number,
    canvas?: CanvasController
  ): void;
  drawFilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas?: CanvasController
  ): void;
  drawUnfilledPolygon(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    complete?: boolean,
    canvas?: CanvasController
  ): void;
  drawFilledPolygon(ctx: CanvasRenderingContext2D, vertices: Point[]): void;
}
