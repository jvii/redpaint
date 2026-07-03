import { BrushInterface } from './Brush';
import { Point } from '../types';
import { DrawTarget } from '../canvas/CanvasController';
import { DrawCallBuffer } from './DrawCallBuffer';
import { symmetryCopies, SymmetryCopy } from '../algorithm/symmetry';
import { brushHistory } from './BrushHistory';
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
    const copies = this.copies();
    if (!copies) {
      this.inner.drawPoints(points, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawPoints(points.map(copy.point), target)
    );
  }

  public drawLine(start: Point, end: Point, canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawLine(start, end, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawLine(copy.point(start), copy.point(end), target)
    );
  }

  public drawCurve(start: Point, end: Point, middlePoint: Point, canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawCurve(start, end, middlePoint, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawCurve(copy.point(start), copy.point(end), copy.point(middlePoint), target)
    );
  }

  public drawUnfilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    const copies = this.copies();
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
    const copies = this.copies();
    if (!copies) {
      this.inner.drawFilledRect(start, end, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) => {
      const [s, e] = rectForCopy(start, end, copy);
      inner.drawFilledRect(s, e, target);
    });
  }

  public drawUnfilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawUnfilledCircle(center, radius, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawUnfilledCircle(copy.point(center), radius, target)
    );
  }

  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawFilledCircle(center, radius, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawFilledCircle(copy.point(center), radius, target)
    );
  }

  public drawUnfilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    const copies = this.copies();
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
    const copies = this.copies();
    if (!copies) {
      this.inner.drawFilledEllipse(center, radiusX, radiusY, rotationAngle, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawFilledEllipse(copy.point(center), radiusX, radiusY, rotationAngle, target)
    );
  }

  public drawUnfilledPolygon(vertices: Point[], complete: boolean, canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawUnfilledPolygon(vertices, complete, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawUnfilledPolygon(vertices.map(copy.point), complete, target)
    );
  }

  public drawFilledPolygon(vertices: Point[], canvas: DrawTarget): void {
    const copies = this.copies();
    if (!copies) {
      this.inner.drawFilledPolygon(vertices, canvas);
      return;
    }
    this.collect(canvas, copies, (inner, copy, target) =>
      inner.drawFilledPolygon(vertices.map(copy.point), target)
    );
  }

  private copies(): SymmetryCopy[] | null {
    const settings = overmind.state.symmetry.activeSettings;
    if (!settings) {
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
export const symmetryBrush = new SymmetryBrush((): BrushInterface => brushHistory.current);
