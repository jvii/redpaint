import { Tool, EventHandlerParams } from './Tool';
import { PaletteState } from '../components/palette/PaletteState';
import { drawDot, drawLineNoAliasing, getMousePos } from './util';
import { Color } from '../types';

export class FreehandTool implements Tool {
  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, toolState, toolStateDispatch } = params;
    console.log('onMouseMove FreehandTool ' + event.button);
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
      setSyncPoint();
      return;
    }
    toolStateDispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, toolStateDispatch } = params;
    console.log('onMouseDown FreehandTool ' + event.button);
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    drawDot(canvas, chooseColor(event, paletteState), position);
    toolStateDispatch({ type: 'freehandToolPrevious', point: position });
    setSyncPoint();
  }

  public onMouseUp(params: EventHandlerParams): void {
    const { event, toolStateDispatch } = params;
    console.log('onMouseUp FreehandTool ' + event.button);
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
  }

  public onMouseLeave(params: EventHandlerParams): void {
    const { event, toolStateDispatch } = params;
    console.log('onMouseLeave FreehandTool ' + event.button);
    toolStateDispatch({ type: 'freehandToolPrevious', point: null });
  }
}

function chooseColor(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  paletteState: PaletteState
): Color {
  console.log(event.buttons);
  if (event.buttons === 1) {
    return paletteState.foregroundColor;
  }
  if (event.buttons === 2) {
    return paletteState.backgroundColor;
  }
  return paletteState.foregroundColor;
}
