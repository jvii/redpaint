export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface PointerState {
  isMouseDown: boolean;
  previousPosition: Point | null;
  currentPosition: Point | null;
}
