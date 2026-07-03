import { DrawTarget } from '../canvas/CanvasController';
import { Point } from '../types';

export interface BrushInterface {
  drawPoints(points: Point[], canvas: DrawTarget): void;
  drawLine(start: Point, end: Point, canvas: DrawTarget): void;
  drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void;
  drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void;
  drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void;
  drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void;
  drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void;
  drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void;
  drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void;
  drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void;
  drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void;
}
