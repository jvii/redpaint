import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton, isLeftMouseButton } from './util';

export class LineTool implements Tool {
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

    if (toolState.lineToolState.startingPosition) {
      const position = getMousePos(canvas, event);
      const start = toolState.lineToolState.startingPosition;
      const end = position;
      state.brush.brush.drawLine(canvas, start, end, isRightMouseButton(event), state);
      undoPoint();
      onDrawToCanvas();
      toolStateDispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'lineToolStart', point: position });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, toolState, state, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    if (toolState.lineToolState.startingPosition && isLeftMouseButton(event)) {
      const start = toolState.lineToolState.startingPosition;
      const end = position;
      state.brush.brush.drawLine(canvas, start, end, isRightMouseButton(event), state);
    } else {
      state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
    }
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
