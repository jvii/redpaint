import { ToolState, Action } from './ToolState';
import { State as PaletteState } from '../overmind/palette/state';
import { State as BrushState } from '../overmind/brush/state';

export interface EventHandlerParams {
  canvas: HTMLCanvasElement;
  onDrawToCanvas: () => void;
  undoPoint: () => void;
  paletteState: PaletteState;
  brushState: BrushState;
  toolState: ToolState;
  toolStateDispatch: React.Dispatch<Action>;
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
