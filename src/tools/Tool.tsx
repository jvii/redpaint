export interface EventHandlerParams {
  canvas: HTMLCanvasElement;
  onDrawToCanvas: () => void;
  undoPoint: () => void;
}

export interface EventHandlerParamsWithEvent extends EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface Tool {
  onInit?(canvas: HTMLCanvasElement): void;
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
