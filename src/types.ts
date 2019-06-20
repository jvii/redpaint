import { ToolState, Action } from './tools/ToolState';

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
  use(
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void;
  use(
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state?: ToolState,
    dispatch?: React.Dispatch<Action>
  ): void;
}
