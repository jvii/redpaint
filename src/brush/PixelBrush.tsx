import { BrushInterface } from './Brush';
import { Point } from '../types';
import {
  line,
  unfilledCircle,
  filledCircle,
  filledRect,
  curve,
  filledEllipse,
  filledPolygon,
  unfilledPolygon,
  filledCircle2,
  unfilledCircle2,
  line2,
  unfilledRect2,
  curve2,
  unfilledEllipse2,
  filledEllipse2,
} from '../algorithm/shape';
import { fillRect } from '../algorithm/primitive';
import { overmind } from '..';
import { pointEquals } from '../tools/util/util';
import { CanvasController } from '../canvas/CanvasController';

export class PixelBrush implements BrushInterface {
  public drawDot(ctx: CanvasRenderingContext2D, point: Point, canvas?: CanvasController): void {
    canvas?.points([point], overmind.state.tool.activeColorIndex);
  }

  public drawLine(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas?: CanvasController
  ): void {
    const line = line2(start, end);
    canvas?.points(line, overmind.state.tool.activeColorIndex);
  }

  public drawCurve(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    middlePoint: Point,
    canvas?: CanvasController
  ): void {
    const curve = curve2(start, end, middlePoint);
    canvas?.points(curve, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledRect(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas: CanvasController
  ): void {
    const unfilledRect = unfilledRect2(start, end);
    canvas?.lines(unfilledRect, overmind.state.tool.activeColorIndex);
  }

  public drawFilledRect(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    canvas: CanvasController
  ): void {
    canvas?.quad?.(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void {
    const unfilledCircle = unfilledCircle2(center, radius);
    canvas?.points(unfilledCircle, overmind.state.tool.activeColorIndex);
  }

  public drawFilledCircle(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    canvas?: CanvasController
  ): void {
    const filledCircle = filledCircle2(center, radius);
    canvas?.lines(filledCircle, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas?: CanvasController
  ): void {
    //unfilledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
    const unfilledEllipse = unfilledEllipse2(center, radiusX, radiusY, rotationAngle);
    canvas?.lines(unfilledEllipse, overmind.state.tool.activeColorIndex);
  }

  public drawFilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas?: CanvasController
  ): void {
    //filledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
    const filledEllipse = filledEllipse2(center, radiusX, radiusY, rotationAngle);
    canvas?.lines(filledEllipse, overmind.state.tool.activeColorIndex);
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
