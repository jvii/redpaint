export interface Point {
  x: number;
  y: number;
}

export interface PointerState {
  isMouseDown: boolean;
  previousPosition: Point | null;
  currentPosition: Point | null;
}

export interface Tool {
  use: (
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    toolState: ToolState,
    setToolState: React.Dispatch<React.SetStateAction<ToolState>>
  ) => void;
}

export class LineToolState {
  public startingPosition: Point | null;
  public constructor() {
    this.startingPosition = null;
  }
}

export class ToolState {
  public lineToolState: LineToolState;
  public constructor() {
    this.lineToolState = new LineToolState();
  }
}
