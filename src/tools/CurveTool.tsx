import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class CurveTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      canvas,
      toolState,
      toolStateDispatch,
      state,
      undoPoint,
      onDrawToCanvas,
    } = params;

    const position = getMousePos(canvas, event);

    if (toolState.curveToolState.startingPosition && !toolState.curveToolState.endPosition) {
      toolStateDispatch({ type: 'curveToolEnd', point: position });
    }

    if (toolState.curveToolState.startingPosition && toolState.curveToolState.endPosition) {
      state.brush.brush.drawCurve(
        canvas,
        toolState.curveToolState.startingPosition,
        toolState.curveToolState.endPosition,
        position,
        isRightMouseButton(event),
        state
      );
      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'curveToolStart', point: null });
      toolStateDispatch({ type: 'curveToolEnd', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, toolStateDispatch } = params;

    if (!toolState.curveToolState.startingPosition && !toolState.curveToolState.endPosition) {
      const position = getMousePos(canvas, event);
      toolStateDispatch({ type: 'curveToolStart', point: position });
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, state, onDrawToCanvas } = params;

    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (toolState.curveToolState.startingPosition && !toolState.curveToolState.endPosition) {
      state.brush.brush.drawLine(
        canvas,
        toolState.curveToolState.startingPosition,
        position,
        isRightMouseButton(event),
        state
      );
      onDrawToCanvas();
    }
    if (toolState.curveToolState.startingPosition && toolState.curveToolState.endPosition) {
      state.brush.brush.drawCurve(
        canvas,
        toolState.curveToolState.startingPosition,
        toolState.curveToolState.endPosition,
        position,
        isRightMouseButton(event),
        state
      );
      onDrawToCanvas();
    }
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}

// Helpers

function isRightMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 2 || event.buttons === 2;
}
