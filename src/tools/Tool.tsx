import { EventHandlerParams } from '../types';

export interface Tool {
  onClick(params: EventHandlerParams): void;
  onContextMenu(params: EventHandlerParams): void;
  onMouseMove(params: EventHandlerParams): void;
  onMouseUp(params: EventHandlerParams): void;
  onMouseDown(params: EventHandlerParams): void;
  onMouseLeave(params: EventHandlerParams): void;
  onMouseEnter(params: EventHandlerParams): void;
}
