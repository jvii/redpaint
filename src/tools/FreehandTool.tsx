import { Tool, EventHandlerParams } from './Tool';
import { drawDot, drawLineNoAliasing, getMousePos, chooseColor } from './util';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParams): void {
    const { event, canvas, paletteState, onDraw, toolState, toolStateDispatch } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    if (event.buttons && toolState.freehandToolState.previousPosition) {
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        toolState.freehandToolState.previousPosition,
        position
      );
      toolStateDispatch({ type: 'freehandToolPrevious', point: position });
      onDraw();
      return;
    }
    toolStateDispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(params: EventHandlerParams): void {
    const { event, canvas, paletteState, onDraw, toolStateDispatch } = params;
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    drawDot(canvas, chooseColor(event, paletteState), position);
    toolStateDispatch({ type: 'freehandToolPrevious', point: position });
    onDraw();
  }

  public onMouseUp(params: EventHandlerParams): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
  }

  public onMouseLeave(params: EventHandlerParams): void {
    const { toolStateDispatch } = params;
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
  }
}
