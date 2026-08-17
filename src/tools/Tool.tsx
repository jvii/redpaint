export interface Tool {
  onInit?(): void;
  onExit?(): void;
  // A requester that edits this tool's own settings is about to open. Anything
  // half-finished belongs to the settings it was started with, so it should be
  // committed now rather than left to be reinterpreted under the new ones.
  onSettingsOpen?(): void;
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
