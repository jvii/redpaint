import { describe, expect, test } from 'vitest';
import { filledCircle, filledEllipse } from '../../src/algorithm/shape';
import { circleRowSpans, ellipseRowSpans, RowSpanTable } from '../../src/algorithm/rowSpans';
import { LineH } from '../../src/domain/LineH';
import { LineV } from '../../src/domain/LineV';

// Ground truth: the exact pixel set the CPU rasterizer (solid fill) paints,
// grouped by row. Used to check the row-span table — built cheaply from the
// same shape functions' O(radius) line output, not by touching every pixel —
// against what actually gets painted.
function pixelRows(lines: (LineH | LineV)[]): Map<number, Set<number>> {
  const rows = new Map<number, Set<number>>();
  for (const line of lines) {
    for (const p of line.asPoints()) {
      let row = rows.get(p.y);
      if (!row) {
        row = new Set();
        rows.set(p.y, row);
      }
      row.add(p.x);
    }
  }
  return rows;
}

function expectTableMatchesPixels(table: RowSpanTable, rows: Map<number, Set<number>>): void {
  const tableYs = new Set(table.spans.map((_, i) => table.yMin + i));
  expect(tableYs).toEqual(new Set(rows.keys()));

  for (const [y, pixels] of rows) {
    const span = table.spans[y - table.yMin];
    const min = Math.min(...pixels);
    const max = Math.max(...pixels);
    expect({ y, min: span.min, max: span.max }).toEqual({ y, min, max });
    // every pixel strictly between min and max must actually be painted —
    // the table only stores the endpoints, so a gap in the middle would
    // pass the min/max check above but paint pixels the shader shouldn't
    for (let x = min; x <= max; x++) {
      expect(pixels.has(x)).toBe(true);
    }
  }
}

describe('circleRowSpans', () => {
  test.each([0, 1, 2, 3, 8, 15, 20, 33, 50])('matches filledCircle pixel-for-pixel at r=%i', (r) => {
    const rows = pixelRows(filledCircle({ x: 0, y: 0 }, r));
    expectTableMatchesPixels(circleRowSpans(r), rows);
  });
});

describe('ellipseRowSpans', () => {
  test.each([
    [10, 10, 0],
    [20, 5, 0],
    [5, 20, 0],
    [15, 8, 37],
    [8, 15, 45],
    [30, 12, 90],
    [1, 40, 20],
  ] as const)('matches filledEllipse pixel-for-pixel at rx=%i ry=%i rot=%i', (rx, ry, rot) => {
    const rows = pixelRows(filledEllipse({ x: 0, y: 0 }, rx, ry, rot));
    expectTableMatchesPixels(ellipseRowSpans(rx, ry, rot), rows);
  });
});
