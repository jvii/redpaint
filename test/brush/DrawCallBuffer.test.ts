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
  points(points: Point[], color: PaintColor): void {}
  lines(lines: (LineH | LineV)[], color: PaintColor): void {}
  quad(start: Point, end: Point, color: PaintColor): void {}
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
