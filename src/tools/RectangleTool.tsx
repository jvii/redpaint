import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class RectangleTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }

  private filled: boolean;

  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      canvas,
      state,
      onDrawToCanvas,
      toolState,
      toolStateDispatch,
      undoPoint,
    } = params;

    if (toolState.rectangleToolState.startingPosition) {
      const position = getMousePos(canvas, event);

      if (this.filled) {
        state.brush.brush.drawRectFilled(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawRect(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      }

      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'rectangleToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'rectangleToolStart', point: position });
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'rectangleToolStart', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);

    if (toolState.rectangleToolState.startingPosition) {
      clearOverlayCanvas(canvas);

      if (this.filled) {
        state.brush.brush.drawRectFilled(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawRect(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      }
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }

  public onMouseUpOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}

// Helpers

function isRightMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 2 || event.buttons === 2;
}
