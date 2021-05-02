export interface EventHandlerParams {
  undoPoint: () => void;
}

export interface EventHandlerParamsOverlay {
  ctx: CanvasRenderingContext2D;
}

export interface EventHandlerParamsWithEvent extends EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface OverlayEventHandlerParamsWithEvent extends EventHandlerParamsOverlay {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface Tool {
  onInit?(params: EventHandlerParams): void;
  onExit?(params: EventHandlerParams): void;
  onClick?(params: EventHandlerParamsWithEvent): void;
  onContextMenu?(params: EventHandlerParamsWithEvent): void;
  onMouseMove?(params: EventHandlerParamsWithEvent): void;
  onMouseUp?(params: EventHandlerParamsWithEvent): void;
  onMouseDown?(params: EventHandlerParamsWithEvent): void;
  onMouseLeave?(params: EventHandlerParamsWithEvent): void;
  onMouseEnter?(params: EventHandlerParamsWithEvent): void;
  onInitOverlay?(params: EventHandlerParamsOverlay): void;
  onExitOverlay?(params: EventHandlerParamsOverlay): void;
  onClickOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseMoveOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseUpOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseDownOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseLeaveOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseEnterOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
}
