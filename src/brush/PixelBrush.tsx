import { BrushInterface } from './Brush';
import { Point } from '../types';
import {
  filledCircle2,
  unfilledCircle2,
  line2,
  unfilledRect2,
  curve2,
  unfilledEllipse2,
  filledEllipse2,
  unfilledPolygon2,
  filledPolygon2,
} from '../algorithm/shape';
import { overmind } from '..';
import { CanvasController } from '../canvas/CanvasController';

export class PixelBrush implements BrushInterface {
  public drawPoint(point: Point, canvas: CanvasController): void {
    canvas.points([point], overmind.state.tool.activeColorIndex);
  }

  public drawLine(start: Point, end: Point, canvas: CanvasController): void {
    const line = line2(start, end);
    canvas.points(line, overmind.state.tool.activeColorIndex);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: CanvasController): void {
    const curve = curve2(start, end, middlePoint);
    canvas.points(curve, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: CanvasController): void {
    const unfilledRect = unfilledRect2(start, end);
    canvas.lines(unfilledRect, overmind.state.tool.activeColorIndex);
  }

  public drawFilledRect(start: Point, end: Point, canvas: CanvasController): void {
    canvas.quad?.(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const unfilledCircle = unfilledCircle2(center, radius);
    canvas.points(unfilledCircle, overmind.state.tool.activeColorIndex);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const filledCircle = filledCircle2(center, radius);
    canvas.lines(filledCircle, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    const unfilledEllipse = unfilledEllipse2(center, radiusX, radiusY, rotationAngle);
    canvas.lines(unfilledEllipse, overmind.state.tool.activeColorIndex);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    const filledEllipse = filledEllipse2(center, radiusX, radiusY, rotationAngle);
    canvas.lines(filledEllipse, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: CanvasController): void {
    const unfilledPolygon = unfilledPolygon2(vertices, complete);
    canvas.points(unfilledPolygon, overmind.state.tool.activeColorIndex);
  }

  public drawFilledPolygon(vertices: Point[], canvas: CanvasController): void {
    const filledPolygon = filledPolygon2(vertices);
    canvas.lines(filledPolygon, overmind.state.tool.activeColorIndex);
  }
}
