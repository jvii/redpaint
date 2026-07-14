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
import { drawFilledLines, drawFilledQuad } from './fillStyleDraw';

export class PixelBrush implements BrushInterface {
  public drawPoints(points: Point[], canvas: DrawTarget): void {
    canvas.points(points, overmind.state.tool.activePaintColor);
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const lineAsPoints = line(start, end);
    canvas.points(lineAsPoints, overmind.state.tool.activePaintColor);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const curveAsPoints = curve(start, end, middlePoint);
    canvas.points(curveAsPoints, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const unfilledRectAsLines = unfilledRect(start, end);
    canvas.lines(unfilledRectAsLines, overmind.state.tool.activePaintColor);
  }

  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    drawFilledQuad(start, end, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const unfilledCircleAsPoints = unfilledCircle(center, radius);
    canvas.points(unfilledCircleAsPoints, overmind.state.tool.activePaintColor);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const filledCircleAsLines = filledCircle(center, radius);
    drawFilledLines(filledCircleAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const unfilledEllipseAsPoints = unfilledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.points(unfilledEllipseAsPoints, overmind.state.tool.activePaintColor);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    drawFilledLines(filledEllipseAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const unfilledPolygonAsPoints = unfilledPolygon(vertices, complete);
    canvas.points(unfilledPolygonAsPoints, overmind.state.tool.activePaintColor);
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    const filledPolygonAsLines = filledPolygon(vertices);
    drawFilledLines(filledPolygonAsLines, canvas, overmind.state.tool.activePaintColor);
  }
}
