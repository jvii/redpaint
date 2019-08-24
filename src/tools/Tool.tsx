import { PaletteState } from '../components/palette/PaletteState';
import { ToolState, Action } from './ToolState';

export interface EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
  canvas: HTMLCanvasElement | null;
  setSyncPoint: () => void;
  paletteState: PaletteState;
  toolState: ToolState;
  toolStateDispatch: React.Dispatch<Action>;
}

export interface Tool {
  onClick?(params: EventHandlerParams): void;
  onContextMenu?(params: EventHandlerParams): void;
  onMouseMove?(params: EventHandlerParams): void;
  onMouseUp?(params: EventHandlerParams): void;
  onMouseDown?(params: EventHandlerParams): void;
  onMouseLeave?(params: EventHandlerParams): void;
  onMouseEnter?(params: EventHandlerParams): void;
}
