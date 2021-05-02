import { BrushInterface } from './Brush';
import { Point, Color } from '../types';
import {
  line,
  unfilledRect,
  unfilledCircle,
  curve,
  filledCircle,
  unfilledEllipse,
  filledEllipse,
  unfilledPolygon,
  filledPolygon,
} from '../algorithm/shape';
import { overmind } from '../index';
import { colorizeTexture } from '../canvas/util/util';
import { CanvasController } from '../canvas/CanvasController';
import { LineV } from '../domain/LineV';

interface CustomBrushFeatures {
  setFGColor(color: Color): void;
  setBGColor(color: Color): void;
  toFGColor(): void;
  toBGColor(): void;
  toMatte(): void;
  getObjectURL(): string;
}

export class CustomBrush implements BrushInterface, CustomBrushFeatures {
  public brushColorIndex = new Uint8Array(); // TODO: acts like getter, so maybe make it one
  public width = 0;
  public heigth = 0;
  public lastChanged = 0;
  private brushColorIndexMatte = new Uint8Array();
  private brushColorIndexColorFG = new Uint8Array();
  private brushColorIndexColorBG = new Uint8Array();

  public constructor(colorIndex: Uint8Array, width: number, height: number) {
    this.width = width;
    this.heigth = height;
    this.brushColorIndex = colorIndex;
    this.brushColorIndexMatte = colorIndex;
    this.lastChanged = Date.now();
  }

  public drawPoint(point: Point, canvas: CanvasController): void {
    canvas.drawImage([this.adjustHandle(point)], this);
  }

  public drawLine(start: Point, end: Point, canvas: CanvasController): void {
    const lineAsPoints = line(this.adjustHandle(start), this.adjustHandle(end));
    canvas.drawImage(lineAsPoints, this);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: CanvasController): void {
    const curveAsPoints = curve(
      this.adjustHandle(start),
      this.adjustHandle(end),
      this.adjustHandle(middlePoint)
    );
    canvas.drawImage(curveAsPoints, this);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: CanvasController): void {
    const unfilledRectAsLines = unfilledRect(this.adjustHandle(start), this.adjustHandle(end));
    const unfilledRectAsPoints: Point[] = [
      ...unfilledRectAsLines[0].asPoints(),
      ...unfilledRectAsLines[1].asPoints(),
      ...unfilledRectAsLines[2].asPoints(),
      ...unfilledRectAsLines[3].asPoints(),
    ]; // rect sides as an array of Points for drawImage
    canvas.drawImage(unfilledRectAsPoints, this);
  }

  public drawFilledRect(start: Point, end: Point, canvas: CanvasController): void {
    // DPaint just draws the filled shape as if using a pixel brush
    canvas.quad(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const unfilledCircleAsPoints = unfilledCircle(this.adjustHandle(center), radius);
    canvas.drawImage(unfilledCircleAsPoints, this);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    // DPaint just draws the filled shape as if using a pixel brush
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
    const unfilledEllipseAsLines = unfilledEllipse(
      this.adjustHandle(center),
      radiusX,
      radiusY,
      rotationAngle
    );
    // ellipse lines as an array of Points for drawImage
    const unfilledEllipseAsPoints = unfilledEllipseAsLines.reduce(
      (acc: Point[], item: LineV): Point[] => acc.concat(item.asPoints()),
      []
    );
    canvas.drawImage(unfilledEllipseAsPoints, this);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    // DPaint just draws the filled shape as if using a pixel brush
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    canvas.lines(filledEllipseAsLines, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: CanvasController): void {
    const unfilledPolygonAsPoints = unfilledPolygon(vertices.map(this.adjustHandle), complete);
    canvas.drawImage(unfilledPolygonAsPoints, this);
  }

  public drawFilledPolygon(vertices: Point[], canvas: CanvasController): void {
    // DPaint just draws the filled shape as if using a pixel brush
    const filledPolygonAsLines = filledPolygon(vertices);
    canvas.lines(filledPolygonAsLines, overmind.state.tool.activeColorIndex);
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }

  // CustomBrushFeatures

  public setFGColor(): void {
    this.brushColorIndexColorFG = colorizeTexture(
      this.brushColorIndex,
      Number(overmind.state.palette.foregroundColorId)
    );
    if (overmind.state.brush.mode === 'Color') {
      this.toFGColor(); // must be set here for fg color, not ideal:(
    }
  }

  public setBGColor(): void {
    this.brushColorIndexColorBG = colorizeTexture(
      this.brushColorIndex,
      Number(overmind.state.palette.backgroundColorId)
    );
  }

  public toFGColor(): void {
    this.brushColorIndex = this.brushColorIndexColorFG;
    this.lastChanged = Date.now();
  }

  public toBGColor(): void {
    this.brushColorIndex = this.brushColorIndexColorBG;
    this.lastChanged = Date.now();
  }

  public toMatte(): void {
    this.brushColorIndex = this.brushColorIndexMatte;
    this.lastChanged = Date.now();
  }

  public getObjectURL(): string {
    //return this.brushImage.src;
    return '';
  }
}
