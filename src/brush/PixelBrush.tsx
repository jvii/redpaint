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
import { drawFilledLines, drawFilledQuad, drawGradientFilledShape } from './fillStyleDraw';
import { CustomBrush } from './CustomBrush';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { ALPHA_INDEXED } from '../domain/CanvasColorIndex';
import { usesEffectDraw } from '../overmind/brush/mode';
import { PaintColor } from '../types';

// A single opaque indexed pixel: the PixelBrush's shape in effect modes.
// Built lazily (not at module scope): PixelBrush sits in an import cycle with
// CustomBrush's own dependency chain (CustomBrush -> PaintingCanvasController
// -> overmind config -> tools -> PixelBrush), so constructing a CustomBrush
// eagerly at PixelBrush's module-load time can run into the CustomBrush class
// binding's temporal dead zone depending on which module in the cycle loads
// first.
let pixelShapeInstance: CustomBrush | null = null;
function pixelShape(): CustomBrush {
  if (!pixelShapeInstance) {
    pixelShapeInstance = new CustomBrush(
      new BrushColorIndex(1, 1, new Uint8Array([0, 0, 0, ALPHA_INDEXED])),
      1,
      1
    );
  }
  // EffectIndexer only reads this brush's alpha as a shape mask when
  // committing to the real canvas, but the overlay preview (which has no
  // equivalent effect logic) just draws its stored color directly - so keep
  // it colorized to FG/BG like any other brush's cursor.
  pixelShapeInstance.applyMode(overmind.state.brush.mode);
  return pixelShapeInstance;
}

export class PixelBrush implements BrushInterface {
  public drawPoints(points: Point[], canvas: DrawTarget): void {
    this.stampOrPoints(points, canvas, overmind.state.tool.activePaintColor);
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const lineAsPoints = line(start, end);
    this.stampOrPoints(lineAsPoints, canvas, overmind.state.tool.activePaintColor);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const curveAsPoints = curve(start, end, middlePoint);
    this.stampOrPoints(curveAsPoints, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const unfilledRectAsLines = unfilledRect(start, end);
    if (usesEffectDraw(overmind.state.brush.mode)) {
      const points = unfilledRectAsLines.flatMap((line) => line.asPoints());
      canvas.effectDraw(points, pixelShape(), 0);
      canvas.flushEffectDraw();
      return;
    }
    canvas.lines(unfilledRectAsLines, overmind.state.tool.activePaintColor);
  }

  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    if (drawGradientFilledShape({ kind: 'rect', start, end }, canvas)) {
      return;
    }
    drawFilledQuad(start, end, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const unfilledCircleAsPoints = unfilledCircle(center, radius);
    this.stampOrPoints(unfilledCircleAsPoints, canvas, overmind.state.tool.activePaintColor);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    if (drawGradientFilledShape({ kind: 'circle', center, radius }, canvas)) {
      return;
    }
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
    this.stampOrPoints(unfilledEllipseAsPoints, canvas, overmind.state.tool.activePaintColor);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    if (
      drawGradientFilledShape({ kind: 'ellipse', center, radiusX, radiusY, rotationAngle }, canvas)
    ) {
      return;
    }
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    drawFilledLines(filledEllipseAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const unfilledPolygonAsPoints = unfilledPolygon(vertices, complete);
    this.stampOrPoints(unfilledPolygonAsPoints, canvas, overmind.state.tool.activePaintColor);
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    if (drawGradientFilledShape({ kind: 'polygon', vertices }, canvas)) {
      return;
    }
    const filledPolygonAsLines = filledPolygon(vertices);
    drawFilledLines(filledPolygonAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  private stampOrPoints(points: Point[], canvas: DrawTarget, color: PaintColor): void {
    if (usesEffectDraw(overmind.state.brush.mode)) {
      canvas.effectDraw(points, pixelShape(), 0);
      canvas.flushEffectDraw();
    } else {
      canvas.points(points, color);
    }
  }
}
