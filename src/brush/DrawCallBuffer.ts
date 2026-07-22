import { DrawTarget } from '../canvas/CanvasController';
import { PaintColor, Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import type { CustomBrush } from './CustomBrush';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';

// A DrawTarget that records draw calls instead of drawing them, then replays
// everything to a real target in as few calls as possible (one per distinct
// color per primitive type). A command buffer, not a canvas.
//
// Used by SymmetryBrush: each symmetry copy of a stroke is drawn (re-rasterized
// by the real brush) into a per-stroke buffer, and the accumulated geometry is
// replayed once. This keeps mirrored strokes gap-free while still paying the
// fixed per-call canvas overhead (WebGL state binds, zoom re-render) only once
// per color, rather than once per copy.
//
// Batched *by color*, not collapsed to one: most strokes are one color across
// every copy (the common case, one real call), but a gradient fill paints
// several colors within what SymmetryBrush treats as a single stroke — each
// copy's own gradient buckets, across every copy, still need to survive the
// buffer and reach the canvas as their own color.
export class DrawCallBuffer implements DrawTarget {
  private pointBatches = new Map<number, { color: PaintColor; points: Point[] }>();
  private lineBatches = new Map<number, { color: PaintColor; lines: (LineH | LineV)[] }>();
  private quadBatches = new Map<
    number,
    { color: PaintColor; quads: { start: Point; end: Point }[] }
  >();
  private imagePointBuffer: Point[] = [];
  private imageBrush: CustomBrush | null = null;
  private effectBatches: { points: Point[]; brush: CustomBrush }[] = [];

  public points(points: Point[], color: PaintColor): void {
    const batch = this.batchFor(this.pointBatches, color, () => ({ color, points: [] }));
    for (const point of points) {
      batch.points.push(point);
    }
  }

  public lines(lines: (LineH | LineV)[], color: PaintColor): void {
    const batch = this.batchFor(this.lineBatches, color, () => ({ color, lines: [] }));
    for (const line of lines) {
      batch.lines.push(line);
    }
  }

  public quad(start: Point, end: Point, color: PaintColor): void {
    const batch = this.batchFor(this.quadBatches, color, () => ({ color, quads: [] }));
    batch.quads.push({ start, end });
  }

  public drawImage(points: Point[], brush: CustomBrush): void {
    this.imageBrush = brush;
    for (const point of points) {
      this.imagePointBuffer.push(point);
    }
  }

  public effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    // the caller's copyId is ignored: the buffer assigns replay ordinals —
    // each symmetry copy contributes exactly one effectDraw per segment
    this.effectBatches.push({ points, brush });
  }

  public endEffectStroke(): void {
    // never buffered: SymmetryBrush buffers per segment, but the stroke ends
    // at the tools' mouse-up, which reaches the controller directly
  }

  private batchFor<T>(map: Map<number, T>, color: PaintColor, create: () => T): T {
    const key = CanvasColorIndex.packPaintColor(color);
    let batch = map.get(key);
    if (!batch) {
      batch = create();
      map.set(key, batch);
    }
    return batch;
  }

  public replayTo(target: DrawTarget): void {
    for (const { color, points } of this.pointBatches.values()) {
      target.points(points, color);
    }
    for (const { color, lines } of this.lineBatches.values()) {
      target.lines(lines, color);
    }
    for (const { color, quads } of this.quadBatches.values()) {
      for (const q of quads) {
        target.quad(q.start, q.end, color);
      }
    }
    if (this.imagePointBuffer.length > 0 && this.imageBrush) {
      target.drawImage(this.imagePointBuffer, this.imageBrush);
    }
    this.effectBatches.forEach((batch, copyId) => {
      target.effectDraw(batch.points, batch.brush, copyId);
    });
  }

  // Like replayTo, but every coordinate is shifted by delta first. Used by
  // SymmetryBrush to reuse one filled shape's rasterize-and-bucket work
  // (the expensive part of a gradient fill) across every symmetry copy: a
  // circle/ellipse/rect stays unrotated under symmetry (only its center
  // moves — see SymmetryBrush's comments), so translating the already-
  // bucketed points is equivalent to re-rasterizing at the copy's own
  // position, and every copy ends up with byte-identical relative dither
  // instead of its own independent random jitter. Only points/lines/quads
  // are translated — filled shapes never produce image/effect draws, so
  // those batches are left for replayTo to handle on the untranslated buffer.
  public translateTo(target: DrawTarget, delta: Point): void {
    const shift = (p: Point): Point => ({ x: p.x + delta.x, y: p.y + delta.y });
    for (const { color, points } of this.pointBatches.values()) {
      target.points(points.map(shift), color);
    }
    for (const { color, lines } of this.lineBatches.values()) {
      target.lines(
        lines.map((line) =>
          line instanceof LineH
            ? new LineH(shift(line.p1), shift(line.p2))
            : new LineV(shift(line.p1), shift(line.p2))
        ),
        color
      );
    }
    for (const { color, quads } of this.quadBatches.values()) {
      for (const q of quads) {
        target.quad(shift(q.start), shift(q.end), color);
      }
    }
  }
}
