import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';

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

    if (!toolState.curveToolState.startingPosition) {
      return;
    }

    const position = getMousePos(canvas, event);

    if (toolState.curveToolState.endPosition) {
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
    } else {
      toolStateDispatch({ type: 'curveToolEnd', point: position });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, toolStateDispatch } = params;

    if (!toolState.curveToolState.endPosition) {
      const position = getMousePos(canvas, event);
      toolStateDispatch({ type: 'curveToolStart', point: position });
    }
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, state, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);

    if (!toolState.curveToolState.startingPosition) {
      state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
      onDrawToCanvas();
      return;
    }

    if (toolState.curveToolState.endPosition) {
      state.brush.brush.drawCurve(
        canvas,
        toolState.curveToolState.startingPosition,
        toolState.curveToolState.endPosition,
        position,
        isRightMouseButton(event),
        state
      );
    } else if (isLeftMouseButton(event)) {
      state.brush.brush.drawLine(
        canvas,
        toolState.curveToolState.startingPosition,
        position,
        isRightMouseButton(event),
        state
      );
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
