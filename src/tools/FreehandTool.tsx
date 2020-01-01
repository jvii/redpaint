import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas } from './util';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas, toolState, toolStateDispatch, state } = params;
    const position = getMousePos(canvas, event);
    if (event.buttons && toolState.freehandToolState.previousPosition) {
      const start = toolState.freehandToolState.previousPosition;
      const end = position;
      state.brush.brush.drawLine(canvas, start, end, isRightMouseButton(event), state);
      toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      onDrawToCanvas();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas, toolStateDispatch, state } = params;
    const position = getMousePos(canvas, event);
    state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
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
    state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), state);
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

// Helpers

function isRightMouseButton(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): boolean {
  return event.button === 2 || event.buttons === 2;
}
