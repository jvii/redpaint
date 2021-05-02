export interface Tool {
  onInit?(): void;
  onExit?(): void;
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
