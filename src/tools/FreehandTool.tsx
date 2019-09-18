import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { drawDot, drawLineNoAliasing, getMousePos, chooseColor, clearOverlayCanvas } from './util';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, paletteState, onDrawToCanvas, toolState, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);

    if (event.buttons && toolState.freehandToolState.previousPosition) {
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        toolState.freehandToolState.previousPosition,
        position
      );
      toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      onDrawToCanvas();
      return;
    }
    //toolStateDispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, paletteState, onDrawToCanvas, toolStateDispatch } = params;
    const position = getMousePos(canvas, event);
    drawDot(canvas, chooseColor(event, paletteState), position);
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
    const { event, canvas, paletteState, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);

    clearOverlayCanvas(canvas);
    drawDot(canvas, paletteState.foregroundColor, position);
    onDrawToCanvas();
  }

  public onMouseLeaveOverlay(params: EventHandlerParamsWithEvent): void {
    const { canvas, onDrawToCanvas } = params;
    clearOverlayCanvas(canvas);
    onDrawToCanvas();
  }
}
