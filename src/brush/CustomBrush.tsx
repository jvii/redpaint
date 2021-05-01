import { BrushInterface } from './Brush';
import { Point, Color } from '../types';
import {
  line2,
  unfilledRect2,
  unfilledCircle2,
  curve2,
  filledCircle2,
  unfilledEllipse2,
  filledEllipse2,
  unfilledPolygon2,
  filledPolygon2,
} from '../algorithm/shape';
import { overmind } from '../index';
import { colorToRGBString } from '../tools/util/util';
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
  public brushImage = new Image(); // TODO: acts like getter, so maybe make it one
  public brushColorIndex = new Uint8Array(); // TODO: acts like getter, so maybe make it one
  public width = 0;
  public heigth = 0;
  public lastChanged = 0;
  private brushImageMatte = new Image();
  private brushImageColorFG = new Image();
  private brushImageColorBG = new Image();
  private brushColorIndexMatte = new Uint8Array();
  private brushColorIndexColorFG = new Uint8Array();
  private brushColorIndexColorBG = new Uint8Array();
  public constructor(dataURL: string, colorIndex?: Uint8Array) {
    this.brushImage.src = dataURL;
    this.brushImage.onload = (): void => {
      this.width = this.brushImage.width;
      this.heigth = this.brushImage.height;
      this.setFGColor(overmind.state.palette.foregroundColor);
      this.setBGColor(overmind.state.palette.backgroundColor);
      if (colorIndex) {
        this.brushColorIndex = colorIndex;
        this.brushColorIndexMatte = colorIndex;
      }
    };
    this.brushImageMatte = this.brushImage;
    this.lastChanged = Date.now();
  }

  public drawPoint(point: Point, canvas: CanvasController): void {
    canvas.drawImage?.([this.adjustHandle(point)], this);
  }

  public drawLine(start: Point, end: Point, canvas: CanvasController): void {
    const line = line2(this.adjustHandle(start), this.adjustHandle(end));
    canvas.drawImage?.(line, this);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: CanvasController): void {
    const curve = curve2(
      this.adjustHandle(start),
      this.adjustHandle(end),
      this.adjustHandle(middlePoint)
    );
    canvas.drawImage?.(curve, this);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: CanvasController): void {
    const unfilledRect = unfilledRect2(this.adjustHandle(start), this.adjustHandle(end));
    const unfilledRectAsPoints: Point[] = [
      ...unfilledRect[0].asPoints(),
      ...unfilledRect[1].asPoints(),
      ...unfilledRect[2].asPoints(),
      ...unfilledRect[3].asPoints(),
    ]; // rect sides as an array of Points for drawImage
    canvas.drawImage?.(unfilledRectAsPoints, this);
  }

  public drawFilledRect(start: Point, end: Point, canvas: CanvasController): void {
    // DPaint just draws the filled shape as if using a pixel brush
    canvas.quad?.(start, end, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    const unfilledCircle = unfilledCircle2(this.adjustHandle(center), radius);
    canvas.drawImage?.(unfilledCircle, this);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: CanvasController): void {
    // DPaint just draws the filled shape as if using a pixel brush
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
    const unfilledEllipse = unfilledEllipse2(
      this.adjustHandle(center),
      radiusX,
      radiusY,
      rotationAngle
    );
    // ellipse lines as an array of Points for drawImage
    const unfilledEllipseAsPoints: Point[] = unfilledEllipse.reduce(
      (acc: Point[], item: LineV): Point[] => acc.concat(item.asPoints()),
      []
    );
    canvas.drawImage?.(unfilledEllipseAsPoints, this);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: CanvasController
  ): void {
    // DPaint just draws the filled shape as if using a pixel brush
    const filledEllipse = filledEllipse2(center, radiusX, radiusY, rotationAngle);
    canvas.lines(filledEllipse, overmind.state.tool.activeColorIndex);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: CanvasController): void {
    const unfilledPolygon = unfilledPolygon2(vertices.map(this.adjustHandle), complete);
    canvas.drawImage?.(unfilledPolygon, this);
  }

  public drawFilledPolygon(vertices: Point[], canvas: CanvasController): void {
    const filledPolygon = filledPolygon2(vertices);
    canvas.lines(filledPolygon, overmind.state.tool.activeColorIndex);
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }

  // CustomBrushFeatures

  public setFGColor(color: Color): void {
    // colorize brush image

    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = Math.abs(this.width);
    bufferCanvas.height = Math.abs(this.heigth);

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(color);
    ctx.fillRect(0, 0, this.width, this.heigth);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.brushImage, 0, 0);
    this.brushImageColorFG.src = bufferCanvas.toDataURL();

    // colorize color index

    this.brushColorIndexColorFG = colorizeTexture(
      this.brushColorIndex,
      Number(overmind.state.palette.foregroundColorId)
    );
    if (overmind.state.brush.mode === 'Color') {
      this.toFGColor(); // must be set here for fg color, not ideal:(
    }
  }

  public setBGColor(color: Color): void {
    // colorize brush image

    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = Math.abs(this.width);
    bufferCanvas.height = Math.abs(this.heigth);

    const ctx = bufferCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(color);
    ctx.fillRect(0, 0, this.width, this.heigth);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.brushImage, 0, 0);
    this.brushImageColorBG.src = bufferCanvas.toDataURL();

    // colorize color index

    this.brushColorIndexColorBG = colorizeTexture(
      this.brushColorIndex,
      Number(overmind.state.palette.backgroundColorId)
    );
  }

  public toFGColor(): void {
    this.brushImage = this.brushImageColorFG;
    this.brushColorIndex = this.brushColorIndexColorFG;
    this.lastChanged = Date.now();
  }

  public toBGColor(): void {
    this.brushImage = this.brushImageColorBG;
    this.brushColorIndex = this.brushColorIndexColorBG;
    this.lastChanged = Date.now();
  }

  public toMatte(): void {
    this.brushImage = this.brushImageMatte;
    this.brushColorIndex = this.brushColorIndexMatte;
    this.lastChanged = Date.now();
  }

  public getObjectURL(): string {
    return this.brushImage.src;
  }
}
