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
import { DrawTarget } from '../canvas/CanvasController';

export class PixelBrush implements BrushInterface {
  public drawPoints(points: Point[], canvas: DrawTarget): void {
    canvas.points(points, overmind.state.tool.activeColorNumber);
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const lineAsPoints = line(start, end);
    canvas.points(lineAsPoints, overmind.state.tool.activeColorNumber);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const curveAsPoints = curve(start, end, middlePoint);
    canvas.points(curveAsPoints, overmind.state.tool.activeColorNumber);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const unfilledRectAsLines = unfilledRect(start, end);
    canvas.lines(unfilledRectAsLines, overmind.state.tool.activeColorNumber);
  }

  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    canvas.quad(start, end, overmind.state.tool.activeColorNumber);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const unfilledCircleAsPoints = unfilledCircle(center, radius);
    canvas.points(unfilledCircleAsPoints, overmind.state.tool.activeColorNumber);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const filledCircleAsLines = filledCircle(center, radius);
    canvas.lines(filledCircleAsLines, overmind.state.tool.activeColorNumber);
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const unfilledEllipseAsLines = unfilledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.lines(unfilledEllipseAsLines, overmind.state.tool.activeColorNumber);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.lines(filledEllipseAsLines, overmind.state.tool.activeColorNumber);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const unfilledPolygonAsPoints = unfilledPolygon(vertices, complete);
    canvas.points(unfilledPolygonAsPoints, overmind.state.tool.activeColorNumber);
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    const filledPolygonAsLines = filledPolygon(vertices);
    canvas.lines(filledPolygonAsLines, overmind.state.tool.activeColorNumber);
  }
}
