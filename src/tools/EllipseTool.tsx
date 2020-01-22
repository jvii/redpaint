import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class EllipseTool implements Tool {
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

    if (toolState.ellipseToolState.centerPoint) {
      const position = getMousePos(canvas, event);
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);

      if (this.filled) {
        state.brush.brush.drawFilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      }

      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'ellipseToolCenter', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'ellipseToolCenter', point: position });
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'ellipseToolCenter', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, toolState, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);

    if (toolState.ellipseToolState.centerPoint) {
      const position = getMousePos(canvas, event);
      const radiusX = Math.abs(position.x - toolState.ellipseToolState.centerPoint.x);
      const radiusY = Math.abs(position.y - toolState.ellipseToolState.centerPoint.y);

      if (this.filled) {
        state.brush.brush.drawFilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      } else {
        state.brush.brush.drawUnfilledEllipse(
          canvas,
          toolState.ellipseToolState.centerPoint,
          radiusX,
          radiusY,
          0,
          isRightMouseButton(event),
          state
        );
      }
      onDrawToCanvas();
    }
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
