import { describe, it, expect } from 'vitest';
import { DrawCallBuffer } from '../../src/brush/DrawCallBuffer';
import { DrawTarget } from '../../src/canvas/CanvasController';
import type { CustomBrush } from '../../src/brush/CustomBrush';
import { Point, PaintColor } from '../../src/types';
import { LineH } from '../../src/domain/LineH';
import { LineV } from '../../src/domain/LineV';

// A CustomBrush stand-in: DrawCallBuffer only passes the brush through, and
// runtime-importing the real class would pull in the DOM-touching controller
// singletons (which is why this is a type-only import above).
const fakeBrush = { width: 3, heigth: 3 } as unknown as CustomBrush;

class RecordingTarget implements DrawTarget {
  public effectCalls: { points: Point[]; brush: CustomBrush; copyId: number }[] = [];
  public pointCalls: { points: Point[]; color: PaintColor }[] = [];
  public lineCalls: { lines: (LineH | LineV)[]; color: PaintColor }[] = [];
  public quadCalls: { start: Point; end: Point; color: PaintColor }[] = [];
  points(points: Point[], color: PaintColor): void {
    this.pointCalls.push({ points, color });
  }
  lines(lines: (LineH | LineV)[], color: PaintColor): void {
    this.lineCalls.push({ lines, color });
  }
  quad(start: Point, end: Point, color: PaintColor): void {
    this.quadCalls.push({ start, end, color });
  }
  drawImage(points: Point[], brush: CustomBrush): void {}
  effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    this.effectCalls.push({ points, brush, copyId });
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
});

describe('DrawCallBuffer.translateTo', () => {
  // SymmetryBrush's reuse of one filled shape's gradient-bucketed points
  // across every symmetry copy (see SymmetryBrush.collectFilledByReferencePoint):
  // shifts every recorded primitive by delta instead of replaying it in place.
  const colorA: PaintColor = { kind: 'index', colorNumber: 5 };
  const colorB: PaintColor = { kind: 'index', colorNumber: 9 };

  it('shifts buffered points by delta, keeping separate color batches', () => {
    const buffer = new DrawCallBuffer();
    buffer.points([{ x: 1, y: 1 }], colorA);
    buffer.points([{ x: 2, y: 2 }], colorB);
    const target = new RecordingTarget();
    buffer.translateTo(target, { x: 10, y: -5 });
    expect(target.pointCalls).toEqual([
      { points: [{ x: 11, y: -4 }], color: colorA },
      { points: [{ x: 12, y: -3 }], color: colorB },
    ]);
  });

  it('shifts buffered lines, preserving horizontal/vertical orientation', () => {
    const buffer = new DrawCallBuffer();
    const hLine = new LineH({ x: 0, y: 0 }, { x: 4, y: 0 });
    const vLine = new LineV({ x: 3, y: 0 }, { x: 3, y: 4 });
    buffer.lines([hLine, vLine], colorA);
    const target = new RecordingTarget();
    buffer.translateTo(target, { x: 2, y: 3 });
    expect(target.lineCalls).toHaveLength(1);
    const [shifted] = target.lineCalls[0].lines;
    expect(shifted).toBeInstanceOf(LineH);
    expect(shifted.p1).toEqual({ x: 2, y: 3 });
    expect(shifted.p2).toEqual({ x: 6, y: 3 });
    const [, shiftedV] = target.lineCalls[0].lines;
    expect(shiftedV).toBeInstanceOf(LineV);
    expect(shiftedV.p1).toEqual({ x: 5, y: 3 });
    expect(shiftedV.p2).toEqual({ x: 5, y: 7 });
  });

  it('shifts buffered quads', () => {
    const buffer = new DrawCallBuffer();
    buffer.quad({ x: 0, y: 0 }, { x: 5, y: 5 }, colorA);
    const target = new RecordingTarget();
    buffer.translateTo(target, { x: -1, y: 2 });
    expect(target.quadCalls).toEqual([
      { start: { x: -1, y: 2 }, end: { x: 4, y: 7 }, color: colorA },
    ]);
  });

  it('is a no-op delta identity when delta is {0, 0}', () => {
    const buffer = new DrawCallBuffer();
    buffer.points([{ x: 7, y: 7 }], colorA);
    const target = new RecordingTarget();
    buffer.translateTo(target, { x: 0, y: 0 });
    expect(target.pointCalls).toEqual([{ points: [{ x: 7, y: 7 }], color: colorA }]);
  });
});
