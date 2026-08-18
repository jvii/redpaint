export interface Tool {
  onInit?(): void;
  onExit?(): void;
  // A setting this tool's output depends on is about to change — its font, the
  // foreground color. Anything half-finished was made under the old setting, so
  // it is committed now rather than left to be reinterpreted under the new one.
  // Called before the change lands, so the commit still sees the old value.
  commitPending?(): void;
  onClick?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onContextMenu?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseMove?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseUp?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseDown?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseLeave?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseEnter?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onInitOverlay?(): void;
  onExitOverlay?(): void;
  onClickOverlay?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseMoveOverlay?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseUpOverlay?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseDownOverlay?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseLeaveOverlay?(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
  onMouseEnterOverlay?(pevent: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void;
}
