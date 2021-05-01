import { BrushInterface } from './Brush';
import { Point } from '../types';
import {
  filledCircle,
  unfilledCircle,
  line,
  unfilledRect,
  curve,
  unfilledEllipse,
  filledEllipse,
  unfilledPolygon,
  filledPolygon,
} from '../algorithm/shape';
import { overmind } from '..';
import { CanvasController } from '../canvas/CanvasController';

export class PixelBrush implements BrushInterface {
  public drawPoint(point: Point, canvas: CanvasController): void {
    canvas.points([point], overmind.state.tool.activeColorIndex);
  }

  public drawLine(start: Point, end: Point, canvas: CanvasController): void {
    const lineAsPoints = line(start, end);
    canvas.points(lineAsPoints, overmind.state.tool.activeColorIndex);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: CanvasController): void {
    const curveAsPoints = curve(start, end, middlePoint);
    canvas.points(curveAsPoints, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: CanvasController): void {
    const unfilledRectSides = unfilledRect(start, end);
    canvas.lines(unfilledRectSides, overmind.state.tool.activeColorIndex);
  }

  public drawFilledRect(start: Point, end: Point, canvas: CanvasController): void {
    canvas.quad?.(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const unfilledCircleAsPoints = unfilledCircle(center, radius);
    canvas.points(unfilledCircleAsPoints, overmind.state.tool.activeColorIndex);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const filledCircleAsLines = filledCircle(center, radius);
    canvas.lines(filledCircleAsLines, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    const unfilledEllipseAsLines = unfilledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.lines(unfilledEllipseAsLines, overmind.state.tool.activeColorIndex);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.lines(filledEllipseAsLines, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: CanvasController): void {
    const unfilledPolygonAsPoints = unfilledPolygon(vertices, complete);
    canvas.points(unfilledPolygonAsPoints, overmind.state.tool.activeColorIndex);
  }

  public drawFilledPolygon(vertices: Point[], canvas: CanvasController): void {
    const filledPolygonAsLines = filledPolygon(vertices);
    canvas.lines(filledPolygonAsLines, overmind.state.tool.activeColorIndex);
  }
}
