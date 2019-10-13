import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, chooseColor, clearOverlayCanvas } from './util';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas, toolState, toolStateDispatch, state } = params;
    const position = getMousePos(canvas, event);
    if (event.buttons && toolState.freehandToolState.previousPosition) {
      state.brush.brush.drawLine(
        canvas,
        chooseColor(event, state.palette),
        toolState.freehandToolState.previousPosition,
        position
      );
      toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      onDrawToCanvas();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas, toolStateDispatch, state } = params;
    const position = getMousePos(canvas, event);
    state.brush.brush.drawDot(canvas, chooseColor(event, state.palette), position);
    toolStateDispatch({ type: 'freehandToolPrevious', point: position });
    onDrawToCanvas();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch, undoPoint } = params;
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, state, onDrawToCanvas } = params;
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);
    state.brush.brush.drawDot(canvas, state.palette.foregroundColor, position);
    onDrawToCanvas();
  }

  public onMouseDownOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
