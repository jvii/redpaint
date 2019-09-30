import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, chooseColor, clearOverlayCanvas } from './util';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const {
      event,
      canvas,
      paletteState,
      brushState,
      onDrawToCanvas,
      toolState,
      toolStateDispatch,
    } = params;
    const position = getMousePos(canvas, event);
    if (event.buttons && toolState.freehandToolState.previousPosition) {
      brushState.brush.drawLine(
        canvas,
        chooseColor(event, paletteState),
        toolState.freehandToolState.previousPosition,
        position
      );
      toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      onDrawToCanvas();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, paletteState, brushState, onDrawToCanvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    brushState.brush.drawDot(canvas, chooseColor(event, paletteState), position);
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
    const { event, canvas, paletteState, brushState, onDrawToCanvas } = params;
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);
    brushState.brush.drawDot(canvas, paletteState.foregroundColor, position);
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
