import { BrushInterface } from './Brush';
import { CustomBrush } from './CustomBrush';
import { Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { DrawCallBuffer } from './DrawCallBuffer';
import { symmetryCopies, SymmetryCopy } from '../algorithm/symmetry';
import { brushRecall } from './BrushRecall';
import { isBuiltInBrush } from '../overmind/brush/state';
import { overmind } from '../index';

// A BrushInterface decorator that applies Deluxe Paint style symmetry by
// re-rasterizing each stroke at every symmetry copy, the way DPaint's SymDo
// did: it transforms the *geometric* arguments (endpoints, center, vertices)
// and re-invokes the wrapped brush, so mirrored copies are freshly rasterized
// at their true angle (no gaps from rotating already-rasterized pixels).
//
// Each stroke's copies are drawn into a per-stroke DrawCallBuffer and replayed
// to the real target in one batched call per primitive type, so we keep the
// single-draw-call performance of point batching.
//
// When symmetry is off it is a transparent pass-through to the wrapped brush.
export class SymmetryBrush implements BrushInterface {
  public constructor(private readonly getInner: () => BrushInterface) {}

  private get inner(): BrushInterface {
    return this.getInner();
  }

  public drawPoints(points: Point[], canvas: DrawTarget): void {
    const copies = this.copies(canvas);
    if (!copies) {
      this.inner.drawPoints(points, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawPoints(points.map(copy.point), target)
    );
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawLine(start, end, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawLine(copy.point(start), copy.point(end), target)
    );
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawCurve(start, end, middlePoint, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawCurve(copy.point(start), copy.point(end), copy.point(middlePoint), target)
    );
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawUnfilledRect(start, end, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) => {
      const [s, e] = rectForCopy(start, end, copy);
      inner.drawUnfilledRect(s, e, target);
    });
  }

  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const copies = this.copies(canvas);
    if (!copies) {
      this.inner.drawFilledRect(start, end, canvas);
      return;
    }
    const center = {
      x: Math.round((start.x + end.x) / 2),
      y: Math.round((start.y + end.y) / 2),
    };
    this.collectFilledByReferencePoint(canvas, copies, center, (inner, target) =>
      inner.drawFilledRect(start, end, target)
    );
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawUnfilledCircle(center, radius, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawUnfilledCircle(copy.point(center), radius, target)
    );
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const copies = this.copies(canvas);
    if (!copies) {
      this.inner.drawFilledCircle(center, radius, canvas);
      return;
    }
    this.collectFilledByReferencePoint(canvas, copies, center, (inner, target) =>
      inner.drawFilledCircle(center, radius, target)
    );
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawUnfilledEllipse(center, radiusX, radiusY, rotationAngle, canvas);
      return;
    }
    // Like rect/oval in DPaint, the ellipse stays unrotated under symmetry;
    // only its center is kaleidoscoped.
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawUnfilledEllipse(copy.point(center), radiusX, radiusY, rotationAngle, target)
    );
  }

  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const copies = this.copies(canvas);
    if (!copies) {
      this.inner.drawFilledEllipse(center, radiusX, radiusY, rotationAngle, canvas);
      return;
    }
    this.collectFilledByReferencePoint(canvas, copies, center, (inner, target) =>
      inner.drawFilledEllipse(center, radiusX, radiusY, rotationAngle, target)
    );
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const copies = this.copies(canvas, true);
    if (!copies) {
      this.inner.drawUnfilledPolygon(vertices, complete, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawUnfilledPolygon(vertices.map(copy.point), complete, target)
    );
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    const copies = this.copies(canvas);
    if (!copies) {
      this.inner.drawFilledPolygon(vertices, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawFilledPolygon(vertices.map(copy.point), target)
    );
  }

  // DPaint kept the hover feedback alive while dragging a shape: the brush
  // is stamped at the pointer's mirrored positions even though the shape
  // copies themselves only appear on release (SYMUP). Only does anything
  // when this brush is currently suppressing the shape copies — with full
  // mirrored previews the copies are already visible. The shape tools call
  // this from their overlay drag branches, which are the only place the
  // pointer position is known.
  public drawPointerCopies(point: Point, canvas: DrawTarget): void {
    if (!this.suppressShapeCopies(canvas)) {
      return;
    }
    const settings = overmind.state.symmetry.activeSettings;
    if (!settings) {
      return;
    }
    const copies = symmetryCopies(settings);
    if (copies.length <= 1) {
      return;
    }
    const buffer = new DrawCallBuffer();
    // skip the primary copy: the shape preview's own brush stamps are there
    for (const copy of copies.slice(1)) {
      this.inner.drawPoints([copy.point(point)], buffer);
    }
    buffer.replayTo(canvas);
  }

  // DPaint's SYMUP behavior (PAINTW.C): with a captured/loaded custom
  // (stamp) brush, the overlay SHAPE preview shows only the primary copy —
  // the full symmetric set appears when the stroke commits on release.
  // Stamping a whole shape's worth of brush copies times 2N on every mouse
  // move (each with the full-canvas re-render a draw call costs) is the
  // heaviest preview path in the app, slow enough to invite a GPU context
  // loss in Safari. Everything else stays fully mirrored: the hover cursor
  // (drawPoints, one stamp per copy — the symmetry-position feedback),
  // filled shapes (they don't stamp the brush, just cheap quads/fill
  // lines), the built-in brushes (small fixed bitmaps, cheap to stamp),
  // and all pixel-brush previews.
  private suppressShapeCopies(canvas: DrawTarget): boolean {
    return (
      canvas === overlayCanvasController &&
      this.inner instanceof CustomBrush &&
      !isBuiltInBrush(this.inner)
    );
  }

  // shapePreview marks the outline-shape draw calls (line, curve, unfilled
  // rect/circle/ellipse/polygon) whose overlay preview re-stamps the brush
  // along the whole shape on every mouse move.
  private copies(canvas: DrawTarget, shapePreview = false): SymmetryCopy[] | null {
    const settings = overmind.state.symmetry.activeSettings;
    if (!settings) {
      return null;
    }
    if (shapePreview && this.suppressShapeCopies(canvas)) {
      return null;
    }
    const copies = symmetryCopies(settings);
    return copies.length > 1 ? copies : null;
  }

  private collect(
    canvas: DrawTarget,
    copies: SymmetryCopy[],
    drawOne: (inner: BrushInterface, copy: SymmetryCopy, target: DrawTarget) => void
  ): void {
    const buffer = new DrawCallBuffer();
    for (const copy of copies) {
      drawOne(this.inner, copy, buffer);
    }
    buffer.replayTo(canvas);
  }

  // Filled rect/circle/ellipse never rotate under symmetry — only their
  // reference point (corner-derived center, or center) is kaleidoscoped;
  // the shape itself stays axis-aligned (see rectForCopy and the comment on
  // drawFilledEllipse above). So every copy is a pure translation of the
  // same shape, and gradient fill's expensive part — rasterizing the shape
  // into points and bucketing them by color, see fillStyleDraw.ts — only
  // needs to happen once: draw the unmoved shape into a scratch buffer,
  // then translate its already-drawn (and, in gradient mode, already-
  // bucketed) primitives by each copy's delta instead of re-rasterizing
  // and re-bucketing from scratch per copy. This also makes copies truly
  // symmetric — byte-identical relative dither — instead of each getting
  // its own independent random jitter. Solid-color fills go through the
  // same path: translating one quad/lines() call costs no more than
  // drawing it fresh, so there's no need to special-case solid mode.
  private collectFilledByReferencePoint(
    canvas: DrawTarget,
    copies: SymmetryCopy[],
    referencePoint: Point,
    drawBase: (inner: BrushInterface, target: DrawTarget) => void
  ): void {
    const scratch = new DrawCallBuffer();
    drawBase(this.inner, scratch);

    const buffer = new DrawCallBuffer();
    for (const copy of copies) {
      const moved = copy.point(referencePoint);
      scratch.translateTo(buffer, { x: moved.x - referencePoint.x, y: moved.y - referencePoint.y });
    }
    buffer.replayTo(canvas);
  }
}

// The rectangle stays axis-aligned and congruent under symmetry (like the
// circle and ellipse). We translate it rigidly so its center follows the
// symmetry transform, keeping its exact width/height, rather than transforming
// the two corners independently (which would vary the aspect ratio per angle).
function rectForCopy(start: Point, end: Point, copy: SymmetryCopy): [Point, Point] {
  const center = {
    x: Math.round((start.x + end.x) / 2),
    y: Math.round((start.y + end.y) / 2),
  };
  const movedCenter = copy.point(center);
  const dx = movedCenter.x - center.x;
  const dy = movedCenter.y - center.y;
  return [
    { x: start.x + dx, y: start.y + dy },
    { x: end.x + dx, y: end.y + dy },
  ];
}

// Singleton wrapping whatever brush is currently selected.
export const symmetryBrush = new SymmetryBrush((): BrushInterface => brushRecall.current);
