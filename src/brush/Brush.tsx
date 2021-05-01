import { CanvasController } from '../canvas/CanvasController';
import { Point } from '../types';

export interface BrushInterface {
  drawPoint(point: Point, canvas: CanvasController): void;
  drawLine(start: Point, end: Point, canvas: CanvasController): void;
  drawCurve(start: Point, end: Point, middlePoint: Point, canvas: CanvasController): void;
  drawUnfilledRect(start: Point, end: Point, canvas: CanvasController): void;
  drawFilledRect(start: Point, end: Point, canvas: CanvasController): void;
  drawUnfilledCircle(center: Point, radius: number, canvas: CanvasController): void;
  drawFilledCircle(center: Point, radius: number, canvas: CanvasController): void;
  drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void;
  drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void;
  drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: CanvasController): void;
  drawFilledPolygon(vertices: Point[], canvas: CanvasController): void;
}
