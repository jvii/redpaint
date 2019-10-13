import { ToolState, Action } from './ToolState';
import { OvermindState } from '../overmind';

export interface EventHandlerParams {
  canvas: HTMLCanvasElement;
  onDrawToCanvas: () => void;
  undoPoint: () => void;
  setSelectionComplete: () => void;
  toolState: ToolState;
  toolStateDispatch: React.Dispatch<Action>;
  state: OvermindState;
}

export interface EventHandlerParamsWithEvent extends EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface Tool {
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
