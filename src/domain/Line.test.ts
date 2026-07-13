import { describe, expect, test } from 'vitest';
import { LineH } from './LineH';
import { LineV } from './LineV';

describe('LineH', () => {
  test('throws when the endpoints are not on the same row', () => {
    expect(() => new LineH({ x: 0, y: 0 }, { x: 5, y: 1 })).toThrow();
  });

  test('asPoints spans left to right regardless of endpoint order', () => {
    const forward = new LineH({ x: 2, y: 4 }, { x: 5, y: 4 }).asPoints();
    const backward = new LineH({ x: 5, y: 4 }, { x: 2, y: 4 }).asPoints();
    const expected = [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ];
    expect(forward).toEqual(expected);
    expect(backward).toEqual(expected);
  });
});

describe('LineV', () => {
  test('throws when the endpoints are not on the same column', () => {
    expect(() => new LineV({ x: 0, y: 0 }, { x: 1, y: 5 })).toThrow();
  });

  test('asPoints spans top to bottom regardless of endpoint order', () => {
    const forward = new LineV({ x: 3, y: 2 }, { x: 3, y: 5 }).asPoints();
    const backward = new LineV({ x: 3, y: 5 }, { x: 3, y: 2 }).asPoints();
    const expected = [
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
    ];
    expect(forward).toEqual(expected);
    expect(backward).toEqual(expected);
  });
});
