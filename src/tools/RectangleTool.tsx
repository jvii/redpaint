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
        state.brush.brush.drawFilledRect(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledRect(
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
    clearOverlayCanvas(canvas);

    if (toolState.rectangleToolState.startingPosition) {
      if (this.filled) {
        state.brush.brush.drawFilledRect(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledRect(
          canvas,
          toolState.rectangleToolState.startingPosition,
          position,
          isRightMouseButton(event),
          state
        );
      }
    } else {
      if (!this.filled) {
        // DPaint doesn't draw filled shapes with the actual brush
        state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
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
