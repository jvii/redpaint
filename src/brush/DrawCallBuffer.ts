import { DrawTarget } from '../canvas/CanvasController';
import { PaintColor, Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import { CustomBrush } from './CustomBrush';

// A DrawTarget that records draw calls instead of drawing them, then replays
// everything to a real target in as few calls as possible (one per primitive
// type). A command buffer, not a canvas.
//
// Used by SymmetryBrush: each symmetry copy of a stroke is drawn (re-rasterized
// by the real brush) into a per-stroke buffer, and the accumulated geometry is
// replayed once. This keeps mirrored strokes gap-free while still paying the
// fixed per-call canvas overhead (WebGL state binds, zoom re-render) only once.
//
// Batching every copy into a single call is valid because all copies of one
// stroke share the same color and the same brush.
export class DrawCallBuffer implements DrawTarget {
  private pointBuffer: Point[] = [];
  private lineBuffer: (LineH | LineV)[] = [];
  private quadBuffer: { start: Point; end: Point }[] = [];
  private imagePointBuffer: Point[] = [];
  private imageBrush: CustomBrush | null = null;
  private color: PaintColor = { kind: 'index', colorNumber: 1 };

  public points(points: Point[], color: PaintColor): void {
    this.color = color;
    for (const point of points) {
      this.pointBuffer.push(point);
    }
  }

  public lines(lines: (LineH | LineV)[], color: PaintColor): void {
    this.color = color;
    for (const line of lines) {
      this.lineBuffer.push(line);
    }
  }

  public quad(start: Point, end: Point, color: PaintColor): void {
    this.color = color;
    this.quadBuffer.push({ start, end });
  }

  public drawImage(points: Point[], brush: CustomBrush): void {
    this.imageBrush = brush;
    for (const point of points) {
      this.imagePointBuffer.push(point);
    }
  }

  public replayTo(target: DrawTarget): void {
    if (this.pointBuffer.length > 0) {
      target.points(this.pointBuffer, this.color);
    }
    if (this.lineBuffer.length > 0) {
      target.lines(this.lineBuffer, this.color);
    }
    for (const q of this.quadBuffer) {
      target.quad(q.start, q.end, this.color);
    }
    if (this.imagePointBuffer.length > 0 && this.imageBrush) {
      target.drawImage(this.imagePointBuffer, this.imageBrush);
    }
  }
}
