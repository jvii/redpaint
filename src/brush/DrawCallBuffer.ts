import { DrawTarget } from '../canvas/CanvasController';
import { PaintColor, Point } from '../types';
import { LineH } from '../domain/LineH';
import { LineV } from '../domain/LineV';
import type { CustomBrush } from './CustomBrush';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { GradientFillStyle, GradientShape } from '../algorithm/gradientFill';

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
//
// Effect draws (Cycle/Smear/Shade/Blend/Smooth) can't merge by color at all —
// each copy's stepped color depends on its own per-copy counter (Cycle's
// cycleStep), so they stay one effectDraw call per copy. What they *can*
// share is the render: effectDraw only indexes, so replayTo issues every
// copy's call before triggering one flushEffectDraw, rather than paying a
// full canvas re-render per copy.
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
  private gradientFills: { shape: GradientShape; style: GradientFillStyle; seed: number }[] = [];

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

  public gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    // no batching: each call is already one cheap GPU draw per shape
    this.gradientFills.push({ shape, style, seed });
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

  public flushEffectDraw(): void {
    // no-op: the buffer never renders: replayTo flushes the real target once
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
    for (const g of this.gradientFills) {
      target.gradientFill(g.shape, g.style, g.seed);
    }
    if (this.imagePointBuffer.length > 0 && this.imageBrush) {
      target.drawImage(this.imagePointBuffer, this.imageBrush);
    }
    if (this.effectBatches.length > 0) {
      this.effectBatches.forEach((batch, copyId) => {
        target.effectDraw(batch.points, batch.brush, copyId);
      });
      // one render for every copy's effectDraw above, instead of one per
      // copy — see the DrawTarget.effectDraw doc comment
      target.flushEffectDraw();
    }
  }
}
