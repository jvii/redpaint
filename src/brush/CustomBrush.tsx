import { Brush } from './Brush';
import { Point, Color } from '../types';
import { drawImage } from '../algorithm/primitive';
import {
  line,
  unfilledRect,
  filledRect,
  unfilledCircle,
  filledCircle,
  curve,
  unfilledEllipse,
  filledEllipse,
  filledPolygon,
  unfilledPolygon,
} from '../algorithm/shape';
import { overmind } from '../index';
import { colorToRGBString } from '../tools/util/util';
import { colorizeTexture } from '../colorIndex/util';

interface CustomBrushFeatures {
  setFGColor(color: Color): void;
  setBGColor(color: Color): void;
  toFGColor(): void;
  toBGColor(): void;
  toMatte(): void;
  getObjectURL(): string;
}

export class CustomBrush implements Brush, CustomBrushFeatures {
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

  public drawDot(ctx: CanvasRenderingContext2D, point: Point): void {
    const pointAdj = this.adjustHandle(point);
    drawImage(pointAdj, this, ctx);
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - (this.width - 1) / 2, y: point.y - (this.heigth - 2) / 2 };
  }

  public drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    line(ctx, this, start, end);
  }

  public drawCurve(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    middlePoint: Point
  ): void {
    curve(ctx, this, start, end, middlePoint);
  }

  public drawLineVertical(ctx: CanvasRenderingContext2D, y1: number, y2: number, x: number): void {
    let startY = y1;
    let endY = y2;

    if (y2 < y1) {
      startY = y2;
      endY = y1;
    }

    for (let y = startY; y <= endY; y++) {
      this.drawDot(ctx, { x: x, y: y });
    }
  }

  public drawLineHorizontal(
    ctx: CanvasRenderingContext2D,
    x1: number,
    x2: number,
    y: number
  ): void {
    let startX = x1;
    let endX = x2;

    if (x2 < x1) {
      startX = x2;
      endX = x1;
    }

    for (let x = startX; x <= endX; x++) {
      this.drawDot(ctx, { x: x, y: y });
    }
  }

  public drawUnfilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    unfilledRect(ctx, this, start, end);
  }

  public drawFilledRect(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
    // DPaint just draws the filled shape as if using a pixel brush
    filledRect(ctx, this, start, end);
  }

  public drawUnfilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    unfilledCircle(ctx, this, center, radius);
  }

  public drawFilledCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    filledCircle(ctx, this, center, radius);
  }

  public drawUnfilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void {
    unfilledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
  }

  public drawFilledEllipse(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number
  ): void {
    filledEllipse(ctx, this, center, radiusX, radiusY, rotationAngle);
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
