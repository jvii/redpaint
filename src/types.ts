export interface Point {
  x: number;
  y: number;
}

export interface PointerState {
  isMouseDown: boolean;
  previousPosition: Point | null;
  currentPosition: Point | null;
}
