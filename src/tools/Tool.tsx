export interface EventHandlerParams {
  canvas: HTMLCanvasElement;
  onPaint: () => void;
  undoPoint: () => void;
}

export interface OverlayEventHandlerParams {
  canvas: HTMLCanvasElement;
  onPaint: () => void;
}

export interface EventHandlerParamsWithEvent extends EventHandlerParams {
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>;
}

export interface OverlayEventHandlerParamsWithEvent extends OverlayEventHandlerParams {
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
  onClickOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseMoveOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseUpOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseDownOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseLeaveOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
  onMouseEnterOverlay?(params: OverlayEventHandlerParamsWithEvent): void;
}
