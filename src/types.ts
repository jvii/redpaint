export interface Point {
  x: number;
  y: number;
}

export interface Line {
  p1: Point;
  p2: Point;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

// The color a tool paints with: either a palette index (recolorable via the
// palette) or a literal RGB color (stored as a true-color pixel, see
// docs/true-color-mode.md).
export type PaintColor =
  | { kind: 'index'; colorNumber: number } // 1-based palette index
  | { kind: 'rgb'; color: Color };
