import { describe, it, expect } from 'vitest';
import { DrawCallBuffer } from '../../src/brush/DrawCallBuffer';
import { DrawTarget } from '../../src/canvas/CanvasController';
import type { CustomBrush } from '../../src/brush/CustomBrush';
import { Point, PaintColor } from '../../src/types';
import { LineH } from '../../src/domain/LineH';
import { LineV } from '../../src/domain/LineV';
import { GradientFillStyle, GradientShape } from '../../src/algorithm/gradientFill';

// A CustomBrush stand-in: DrawCallBuffer only passes the brush through, and
// runtime-importing the real class would pull in the DOM-touching controller
// singletons (which is why this is a type-only import above).
const fakeBrush = { width: 3, heigth: 3 } as unknown as CustomBrush;

class RecordingTarget implements DrawTarget {
  public effectCalls: { points: Point[]; brush: CustomBrush; copyId: number }[] = [];
  public gradientCalls: { shape: GradientShape; style: GradientFillStyle; seed: number }[] = [];
  public flushEffectDrawCalls = 0;
  points(points: Point[], color: PaintColor): void {}
  lines(lines: (LineH | LineV)[], color: PaintColor): void {}
  quad(start: Point, end: Point, color: PaintColor): void {}
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    this.gradientCalls.push({ shape, style, seed });
  }
  drawImage(points: Point[], brush: CustomBrush): void {}
  effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    this.effectCalls.push({ points, brush, copyId });
  }
  flushEffectDraw(): void {
    this.flushEffectDrawCalls++;
  }
  endEffectStroke(): void {}
}

describe('DrawCallBuffer effect draws', () => {
  it('replays each buffered effectDraw with its ordinal as copyId', () => {
    const buffer = new DrawCallBuffer();
    const a: Point[] = [{ x: 1, y: 1 }];
    const b: Point[] = [{ x: 2, y: 2 }];
    // callers always pass copyId 0; the buffer assigns copy identity on replay
    buffer.effectDraw(a, fakeBrush, 0);
    buffer.effectDraw(b, fakeBrush, 0);
    const target = new RecordingTarget();
    buffer.replayTo(target);
    expect(target.effectCalls).toEqual([
      { points: a, brush: fakeBrush, copyId: 0 },
      { points: b, brush: fakeBrush, copyId: 1 },
    ]);
  });

  it('flushes once for the whole batch, not once per copy', () => {
    const buffer = new DrawCallBuffer();
    buffer.effectDraw([{ x: 1, y: 1 }], fakeBrush, 0);
    buffer.effectDraw([{ x: 2, y: 2 }], fakeBrush, 0);
    buffer.effectDraw([{ x: 3, y: 3 }], fakeBrush, 0);
    const target = new RecordingTarget();
    buffer.replayTo(target);
    expect(target.flushEffectDrawCalls).toBe(1);
  });

  it('does not flush when no effect draws were recorded', () => {
    const buffer = new DrawCallBuffer();
    buffer.points([{ x: 1, y: 1 }], { kind: 'index', colorNumber: 1 });
    const target = new RecordingTarget();
    buffer.replayTo(target);
    expect(target.flushEffectDrawCalls).toBe(0);
  });
});

describe('DrawCallBuffer gradient fills', () => {
  it('replays each recorded gradientFill in order with its shape, style and seed', () => {
    const buffer = new DrawCallBuffer();
    const style: GradientFillStyle = { axis: 'vertical', rangeLow: 1, rangeHigh: 4, dither: 0 };
    const circle: GradientShape = { kind: 'circle', center: { x: 5, y: 5 }, radius: 3 };
    const rect: GradientShape = { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 2, y: 2 } };
    // one call per symmetry copy of the same stroke: same style, same seed
    buffer.gradientFill(circle, style, 42);
    buffer.gradientFill(rect, style, 42);
    const target = new RecordingTarget();
    buffer.replayTo(target);
    expect(target.gradientCalls).toEqual([
      { shape: circle, style, seed: 42 },
      { shape: rect, style, seed: 42 },
    ]);
  });
});
