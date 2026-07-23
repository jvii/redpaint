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
import { foregroundPaintColorOf, backgroundPaintColorOf } from '../overmind/palette/state';
import { Mode, usesEffectDraw, usesColorizedBrush } from '../overmind/brush/mode';
import { colorizeTexture } from '../canvas/util/util';
import { DrawTarget } from '../canvas/CanvasController';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR } from '../domain/CanvasColorIndex';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { drawFilledLines, drawFilledQuad, drawGradientFilledShape } from './fillStyleDraw';

interface CustomBrushFeatures {
  setFGColor(color: Color): void;
  setBGColor(color: Color): void;
  toFGColor(): void;
  toBGColor(): void;
  toMatte(): void;
}

export class CustomBrush implements BrushInterface, CustomBrushFeatures {
  public brushColorIndex: BrushColorIndex; // TODO: acts like getter, so maybe make it one
  public width: number;
  public heigth: number;
  public lastChanged: number;
  private brushColorIndexMatte: BrushColorIndex;
  private brushColorIndexColorFG: BrushColorIndex;
  private brushColorIndexColorBG: BrushColorIndex;

  public constructor(colorIndex: BrushColorIndex, width: number, height: number) {
    this.width = width;
    this.heigth = height;
    this.brushColorIndex = colorIndex;
    this.brushColorIndexMatte = colorIndex;
    this.brushColorIndexColorFG = colorIndex;
    this.brushColorIndexColorBG = colorIndex;
    this.lastChanged = Date.now();
  }

  // Factory method for extracting a brush from canvas
  public static fromCanvasArea(start: Point, width: number, height: number): CustomBrush {
    const brushColorIndex = paintingCanvasController.getBrushColorIndexFromArea(
      start,
      width,
      height
    );
    if (!brushColorIndex) {
      throw new Error('Failed to get brush color index from area');
    }
    return new CustomBrush(brushColorIndex, width, height);
  }

  // Factory method for decoding a brush from an image URL (opened file or
  // clipboard paste buffer)
  public static async fromImageUrl(url: string): Promise<CustomBrush> {
    const image = new Image();
    await new Promise<void>((resolve, reject): void => {
      image.onload = (): void => resolve();
      image.onerror = (): void => reject(new Error('Failed to decode image'));
      image.src = url;
    });
    const decodeCanvas = document.createElement('canvas');
    decodeCanvas.width = image.width;
    decodeCanvas.height = image.height;
    const ctx = decodeCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to decode image');
    }
    ctx.drawImage(image, 0, 0);
    const brushColorIndex = BrushColorIndex.fromImageData(
      ctx.getImageData(0, 0, image.width, image.height)
    );
    return new CustomBrush(brushColorIndex, image.width, image.height);
  }

  public drawPoints(points: Point[], canvas: DrawTarget): void {
    this.stamp(
      points.map((point) => this.adjustHandle(point)),
      canvas
    );
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const lineAsPoints = line(this.adjustHandle(start), this.adjustHandle(end));
    this.stamp(lineAsPoints, canvas);
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const curveAsPoints = curve(
      this.adjustHandle(start),
      this.adjustHandle(end),
      this.adjustHandle(middlePoint)
    );
    this.stamp(curveAsPoints, canvas);
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const unfilledRectAsLines = unfilledRect(this.adjustHandle(start), this.adjustHandle(end));
    const unfilledRectAsPoints: Point[] = [
      ...unfilledRectAsLines[0].asPoints(),
      ...unfilledRectAsLines[1].asPoints(),
      ...unfilledRectAsLines[2].asPoints(),
      ...unfilledRectAsLines[3].asPoints(),
    ]; // rect sides as an array of Points for drawImage
    this.stamp(unfilledRectAsPoints, canvas);
  }

  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    // DPaint just draws the filled shape as if using a pixel brush
    if (drawGradientFilledShape({ kind: 'rect', start, end }, canvas)) {
      return;
    }
    drawFilledQuad(start, end, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const unfilledCircleAsPoints = unfilledCircle(this.adjustHandle(center), radius);
    this.stamp(unfilledCircleAsPoints, canvas);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    // DPaint just draws the filled shape as if using a pixel brush
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
    const unfilledEllipseAsPoints = unfilledEllipse(
      this.adjustHandle(center),
      radiusX,
      radiusY,
      rotationAngle
    );
    this.stamp(unfilledEllipseAsPoints, canvas);
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    // DPaint just draws the filled shape as if using a pixel brush
    if (
      drawGradientFilledShape({ kind: 'ellipse', center, radiusX, radiusY, rotationAngle }, canvas)
    ) {
      return;
    }
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    drawFilledLines(filledEllipseAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const unfilledPolygonAsPoints = unfilledPolygon(
      vertices.map(this.adjustHandle.bind(this)),
      complete
    );
    this.stamp(unfilledPolygonAsPoints, canvas);
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    // DPaint just draws the filled shape as if using a pixel brush
    if (drawGradientFilledShape({ kind: 'polygon', vertices }, canvas)) {
      return;
    }
    const filledPolygonAsLines = filledPolygon(vertices);
    drawFilledLines(filledPolygonAsLines, canvas, overmind.state.tool.activePaintColor);
  }

  // Returns a new transformed brush rather than mutating: the caller swaps it
  // in via brushRecall.setTransformed, which keeps lastChanged-based texture
  // caching correct and the pre-transform original recallable. Transforms
  // always read the matte (source-of-truth) bitmap, never a colorized variant.
  public transform(fn: (index: BrushColorIndex) => BrushColorIndex): CustomBrush {
    const transformed = fn(this.brushColorIndexMatte);
    return new CustomBrush(transformed, transformed.width, transformed.height);
  }

  private adjustHandle(point: Point): Point {
    return { x: point.x - this.width / 2, y: point.y - this.heigth / 2 }; // center handle to brush
  }

  private stamp(points: Point[], canvas: DrawTarget): void {
    if (usesEffectDraw(overmind.state.brush.mode)) {
      canvas.effectDraw(points, this, 0);
      canvas.flushEffectDraw();
    } else {
      canvas.drawImage(points, this);
    }
  }

  // Sets up the bitmap variants a paint mode needs and switches to that
  // mode's resting bitmap — the single place encoding which modes show the
  // colorized brush vs the matte one (used by the setMode action and by
  // transform previews on temporary brushes).
  public applyMode(mode: Mode): void {
    if (usesColorizedBrush(mode)) {
      // Color, Cycle and the canvas-reading effects all show (and Color/
      // Cycle paint) the FG-colorized bitmap — the effects only ever read
      // its alpha as a shape mask, but the colorized version is the more
      // useful overlay cursor.
      this.setFGColor();
      this.setBGColor();
      this.toFGColor();
    } else {
      // Matte previews the brush's own transparency; Repl stamps that same
      // pristine bitmap with holes filled from BG — both need the matte
      // bitmap as their resting state, not a colorized one.
      this.setBGColor();
      this.toMatte();
    }
  }

  // CustomBrushFeatures

  public setFGColor(): void {
    // always colorize from the pristine matte bitmap so recoloring never
    // compounds on a previously colorized array
    this.brushColorIndexColorFG = new BrushColorIndex(
      this.width,
      this.heigth,
      colorizeTexture(
        this.brushColorIndexMatte.indexArray,
        foregroundPaintColorOf(overmind.state.palette)
      )
    );
    if (usesColorizedBrush(overmind.state.brush.mode)) {
      this.toFGColor(); // must be set here for fg color, not ideal:(
    }
  }

  public setBGColor(): void {
    this.brushColorIndexColorBG = new BrushColorIndex(
      this.width,
      this.heigth,
      colorizeTexture(
        this.brushColorIndexMatte.indexArray,
        backgroundPaintColorOf(overmind.state.palette)
      )
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

  // Resolves the brush's original (matte) bitmap into displayable pixels for
  // saving: indexed pixels through the palette, true-color pixels directly,
  // transparent pixels as alpha 0. Texture rows are bottom-up, ImageData rows
  // top-down, so rows are flipped back here.
  public toImageData(): ImageData {
    const source = this.brushColorIndexMatte.indexArray;
    const data = new Uint8ClampedArray(this.width * this.heigth * 4);
    for (let y = 0; y < this.heigth; y++) {
      const sourceRow = (this.heigth - y - 1) * this.width * 4;
      const targetRow = y * this.width * 4;
      for (let x = 0; x < this.width; x++) {
        const s = sourceRow + x * 4;
        const t = targetRow + x * 4;
        const tag = source[s + 3];
        if (tag === ALPHA_TRUECOLOR) {
          data[t] = source[s];
          data[t + 1] = source[s + 1];
          data[t + 2] = source[s + 2];
          data[t + 3] = 255;
        } else if (tag === ALPHA_INDEXED) {
          const color = overmind.state.palette.palette[String(source[s] + 1)];
          if (color) {
            data[t] = color.r;
            data[t + 1] = color.g;
            data[t + 2] = color.b;
            data[t + 3] = 255;
          }
        }
        // transparent pixels stay all-zero (alpha 0)
      }
    }
    return new ImageData(data, this.width, this.heigth);
  }
}
