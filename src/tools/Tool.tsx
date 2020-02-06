import { ToolState, Action } from './ToolState';
import { OvermindState } from '../overmind';
export interface EventHandlerParams {
  canvas: HTMLCanvasElement;
  onDrawToCanvas: () => void;
  undoPoint: () => void;
  toolState: ToolState;
  toolStateDispatch: React.Dispatch<Action>;
  state: OvermindState;
}

export interface EventHandlerParamsWithEvent extends EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface OnInitParams {
  canvas: HTMLCanvasElement;
  toolState: ToolState;
  toolStateDispatch: React.Dispatch<Action>;
}

export interface Tool {
  onInit?(params: OnInitParams): void;
  onClick?(params: EventHandlerParamsWithEvent): void;
  onContextMenu?(params: EventHandlerParamsWithEvent): void;
  onMouseMove?(params: EventHandlerParamsWithEvent): void;
  onMouseUp?(params: EventHandlerParamsWithEvent): void;
  onMouseDown?(params: EventHandlerParamsWithEvent): void;
  onMouseLeave?(params: EventHandlerParamsWithEvent): void;
  onMouseEnter?(params: EventHandlerParamsWithEvent): void;
  onMouseMoveOverlay?(params: EventHandlerParamsWithEvent): void;
  onMouseLeaveOverlay?(params: EventHandlerParamsWithEvent): void;
}
