import { Tool, EventHandlerParamsWithEvent } from './Tool';
import { getMousePos, clearOverlayCanvas, isRightMouseButton } from './util';
import { overmind } from '../index';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParamsWithEvent): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;

    //if (event.buttons && toolState.freehandToolState.previousPosition) {
    if (event.buttons && overmind.state.tool.freehandTool.previous) {
      const position = getMousePos(canvas, event);
      const start = overmind.state.tool.freehandTool.previous;
      //const start = toolState.freehandToolState.previousPosition;
      const end = position;
      overmind.state.brush.brush.drawLine(
        canvas,
        start,
        end,
        isRightMouseButton(event),
        overmind.state
      );
      //toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      overmind.actions.tool.freeHandToolPrevious(position);
      onDrawToCanvas();
    }
  }

  public onMouseDown(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
    const position = getMousePos(canvas, event);
    overmind.state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), overmind.state);
    //toolStateDispatch({ type: 'freehandToolPrevious', point: position });
    overmind.actions.tool.freeHandToolPrevious(position);

    onDrawToCanvas();
  }

  public onMouseUp(params: EventHandlerParamsWithEvent): void {
    const { undoPoint } = params;
    //toolStateDispatch({ type: 'freehandToolPrevious', point: null });
    overmind.actions.tool.freeHandToolPrevious(null);
    undoPoint();
  }

  public onMouseLeave(params: EventHandlerParamsWithEvent): void {
    overmind.actions.tool.freeHandToolPrevious(null);
  }

  public onMouseEnter(params: EventHandlerParamsWithEvent): void {
    const { event, canvas } = params;
    const position = getMousePos(canvas, event);
    //toolStateDispatch({ type: 'freehandToolPrevious', point: position });
    overmind.actions.tool.freeHandToolPrevious(position);
  }

  // Overlay

  public onMouseMoveOverlay(params: EventHandlerParamsWithEvent): void {
    const { event, canvas, onDrawToCanvas } = params;
    if (event.buttons) {
      return;
    }
    clearOverlayCanvas(canvas);
    const position = getMousePos(canvas, event);
    overmind.state.brush.brush.drawDot(canvas, position, isRightMouseButton(event), overmind.state);
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
