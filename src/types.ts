import { ToolState, Action } from "./tools/ToolState";
import { PaletteState } from "./components/palette/PaletteState";

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

export interface EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
  canvas: HTMLCanvasElement | null;
  setSyncPoint: React.Dispatch<React.SetStateAction<number>>;
  paletteState: PaletteState;
  state: ToolState;
  dispatch: React.Dispatch<Action>;
}
