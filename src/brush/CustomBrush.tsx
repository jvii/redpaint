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
import { plainPalette } from '../algorithm/imageColors';
import { Mode, usesEffectDraw, usesColorizedBrush } from '../overmind/brush/mode';
import { colorizeTexture } from '../canvas/util/util';
import { DrawTarget } from '../canvas/CanvasController';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { BuiltInFamily } from '../algorithm/builtInBrushShapes';
import { ALPHA_INDEXED, ALPHA_TRUECOLOR } from '../domain/CanvasColorIndex';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { drawStyledFilledShape } from './fillStyleDraw';
import { isBrushTransformTool } from '../overmind/toolbox/brushTransformTools';

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
  // Set on the built-in brushes and on a right-click resize of one, so a
  // resized instance still reads as built-in. What isBuiltInBrush checks.
  public builtInFamily?: BuiltInFamily;
  // The palette this brush's indices mean, so a later palette change stays
  // recoverable (docs/brush-palette.md). Undefined for a true-color brush and
  // for the built-ins, neither of which holds palette indices.
  public palette?: Color[];
  private brushColorIndexMatte: BrushColorIndex;
  private brushColorIndexColorFG: BrushColorIndex;
  private brushColorIndexColorBG: BrushColorIndex;

  public constructor(
    colorIndex: BrushColorIndex,
    width: number,
    height: number,
    builtInFamily?: BuiltInFamily
  ) {
    this.width = width;
    this.heigth = height;
    this.brushColorIndex = colorIndex;
    this.brushColorIndexMatte = colorIndex;
    this.brushColorIndexColorFG = colorIndex;
    this.brushColorIndexColorBG = colorIndex;
    this.lastChanged = Date.now();
    this.builtInFamily = builtInFamily;
  }

  public static fromCanvasArea(start: Point, width: number, height: number): CustomBrush {
    const brushColorIndex = paintingCanvasController.getBrushColorIndexFromArea(
      start,
      width,
      height
    );
    if (!brushColorIndex) {
      throw new Error('Failed to get brush color index from area');
    }
    const brush = new CustomBrush(brushColorIndex, width, height);
    brush.palette = plainPalette(Object.values(overmind.state.palette.palette));
    return brush;
  }

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
    drawStyledFilledShape({ kind: 'rect', start, end }, canvas);
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const unfilledCircleAsPoints = unfilledCircle(this.adjustHandle(center), radius);
    this.stamp(unfilledCircleAsPoints, canvas);
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    // DPaint just draws the filled shape as if using a pixel brush
    drawStyledFilledShape({ kind: 'circle', center, radius }, canvas, () =>
      filledCircle(center, radius)
    );
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
    drawStyledFilledShape(
      { kind: 'ellipse', center, radiusX, radiusY, rotationAngle },
      canvas,
      () => filledEllipse(center, radiusX, radiusY, rotationAngle)
    );
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
    drawStyledFilledShape({ kind: 'polygon', vertices }, canvas, () => filledPolygon(vertices));
  }

  // A new brush rather than a mutation, so the pre-transform one stays
  // recallable and texture caching keys off a fresh lastChanged. Always reads
  // the matte bitmap, never a colorized variant.
  public transform(fn: (index: BrushColorIndex) => BrushColorIndex): CustomBrush {
    const transformed = fn(this.brushColorIndexMatte);
    const brush = new CustomBrush(transformed, transformed.width, transformed.height);
    // Reshaping moves pixels without reinterpreting them, so the palette
    // carries over — which is also what keeps a slotted brush's palette, a
    // recall being an identity transform.
    brush.palette = this.palette;
    return brush;
  }

  // Where the brush is held when nothing is reshaping it, and what a saved
  // GRAB records. Built-ins are always centred: the point of the small ones is
  // that the pixel under the cursor is the one painted.
  public restingHandle(): Point {
    return overmind.state.brush.handleMode === 'center' || this.builtInFamily !== undefined
      ? { x: this.width / 2, y: this.heigth / 2 }
      : { x: this.width - 1, y: this.heigth - 1 };
  }

  // Centred throughout a transform drag, whatever the setting says: those tools
  // place the preview and its bounds box from the drag anchor, so an off-centre
  // handle slides the preview out of the box it is being sized inside.
  public handle(): Point {
    if (isBrushTransformTool(overmind.state.toolbox.selectedSelectorToolId)) {
      return { x: this.width / 2, y: this.heigth / 2 };
    }
    return this.restingHandle();
  }

  private adjustHandle(point: Point): Point {
    const handle = this.handle();
    return { x: point.x - handle.x, y: point.y - handle.y };
  }

  private stamp(points: Point[], canvas: DrawTarget): void {
    if (usesEffectDraw(overmind.state.brush.mode)) {
      canvas.effectDraw(points, this, 0);
      canvas.flushEffectDraw();
    } else {
      canvas.drawImage(points, this);
    }
  }

  // The one place deciding which modes show the colorized bitmap and which the
  // matte one, and switches to it.
  public applyMode(mode: Mode): void {
    if (usesColorizedBrush(mode)) {
      // The effects read only the alpha, but the colorized bitmap is the more
      // useful overlay cursor.
      this.setFGColor();
      this.setBGColor();
      this.toFGColor();
    } else {
      // Matte shows the brush's own transparency and Repl fills those holes
      // from BG; both rest on the matte bitmap.
      this.setBGColor();
      this.toMatte();
    }
  }

  // CustomBrushFeatures

  public setFGColor(): void {
    // From the matte bitmap, so recoloring never compounds.
    this.brushColorIndexColorFG = this.brushColorIndexMatte.derive(
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
    this.brushColorIndexColorBG = this.brushColorIndexMatte.derive(
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

  // The matte bitmap, never a colorized variant, as toImageData also takes.
  public brushColorIndexForSaving(): BrushColorIndex {
    return this.brushColorIndexMatte;
  }

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
