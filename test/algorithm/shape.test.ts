import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';
import {
  curve,
  filledCircle,
  filledEllipse,
  filledPolygon,
  line,
  unfilledCircle,
  unfilledEllipse,
  unfilledPolygon,
  unfilledRect,
} from '../../src/algorithm/shape';
import { rasterizeLines, rasterizePoints } from '../pixelGrid';
import { expectMatchesFixture } from '../shapeFixture';

const HERE = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): string {
  return join(HERE, '__fixtures__', 'shape', `${name}.png`);
}

describe('shape (visual fixtures)', () => {
  test('line', () => {
    const grid = rasterizePoints(line({ x: 2, y: 20 }, { x: 30, y: 4 }), 32, 24);
    expectMatchesFixture(grid, fixture('line'));
  });

  test('curve', () => {
    const grid = rasterizePoints(
      curve({ x: 2, y: 22 }, { x: 30, y: 22 }, { x: 16, y: 2 }),
      32,
      24
    );
    expectMatchesFixture(grid, fixture('curve'));
  });

  test('unfilled rect', () => {
    const grid = rasterizeLines(unfilledRect({ x: 4, y: 4 }, { x: 27, y: 19 }), 32, 24);
    expectMatchesFixture(grid, fixture('unfilled-rect'));
  });

  test('filled circle', () => {
    const grid = rasterizeLines(filledCircle({ x: 15, y: 15 }, 10), 32, 32);
    expectMatchesFixture(grid, fixture('filled-circle-r10'));
  });

  test('unfilled circle', () => {
    const grid = rasterizePoints(unfilledCircle({ x: 15, y: 15 }, 10), 32, 32);
    expectMatchesFixture(grid, fixture('unfilled-circle-r10'));
  });

  test('unfilled ellipse', () => {
    const grid = rasterizePoints(unfilledEllipse({ x: 20, y: 15 }, 16, 8, 20), 40, 32);
    expectMatchesFixture(grid, fixture('unfilled-ellipse'));
  });

  test('filled ellipse', () => {
    const grid = rasterizeLines(filledEllipse({ x: 20, y: 15 }, 16, 8, 20), 40, 32);
    expectMatchesFixture(grid, fixture('filled-ellipse'));
  });

  test('unfilled polygon', () => {
    const grid = rasterizePoints(
      unfilledPolygon([
        { x: 16, y: 2 },
        { x: 30, y: 12 },
        { x: 24, y: 28 },
        { x: 8, y: 28 },
        { x: 2, y: 12 },
      ]),
      32,
      32
    );
    expectMatchesFixture(grid, fixture('unfilled-polygon-star'));
  });

  test('filled polygon', () => {
    const grid = rasterizeLines(
      filledPolygon([
        { x: 16, y: 2 },
        { x: 30, y: 12 },
        { x: 24, y: 28 },
        { x: 8, y: 28 },
        { x: 2, y: 12 },
      ]),
      32,
      32
    );
    expectMatchesFixture(grid, fixture('filled-polygon-star'));
  });
});

describe('shape (edge cases)', () => {
  test('a zero-length line is a single dot', () => {
    expect(line({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }]);
  });

  test('a zero-radius filled circle is a single dot', () => {
    const result = filledCircle({ x: 5, y: 5 }, 0);
    expect(result).toHaveLength(1);
    expect(result[0].asPoints()).toEqual([{ x: 5, y: 5 }]);
  });

  test('a zero-radius unfilled circle is a single dot', () => {
    expect(unfilledCircle({ x: 5, y: 5 }, 0)).toEqual([{ x: 5, y: 5 }]);
  });

  test('an unfilled rect with equal-valued but distinct start/end points collapses to one point', () => {
    // unfilledRect's "just draw a dot" special case checks start === end by
    // object reference, which two separately-constructed points never are —
    // in practice it falls through to four zero-length edges that all land
    // on the same pixel
    const result = unfilledRect({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(result).toHaveLength(4);
    for (const edge of result) {
      expect(edge.asPoints()).toEqual([{ x: 5, y: 5 }]);
    }
  });

  test('unfilledPolygon with complete=false omits the closing edge', () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const open = unfilledPolygon(vertices, false);
    const closed = unfilledPolygon(vertices, true);
    expect(closed.length).toBeGreaterThan(open.length);
  });
});
