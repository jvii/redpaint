import { Tool, EventHandlerParams } from './Tool';
import { PaletteState } from '../components/palette/PaletteState';
import { Color } from '../types';
import { drawLineNoAliasing, getMousePos } from './util';

export class LineTool implements Tool {
  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseUp(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, toolState, toolStateDispatch } = params;
    console.log('onMouseUp LineTool ' + event.button);
    if (!canvas) {
      return;
    }
    if (toolState.lineToolState.startingPosition) {
      const position = getMousePos(canvas, event);
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        toolState.lineToolState.startingPosition,
        position
      );
      setSyncPoint();
      toolStateDispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParams): void {
    const { event, canvas, toolStateDispatch } = params;
    console.log('onMouseDown LineTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    toolStateDispatch({ type: 'lineToolStart', point: position });
  }
}

function chooseColor(
  event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  paletteState: PaletteState
): Color {
  if (event.button === 0) {
    return paletteState.foregroundColor;
  }
  if (event.button === 2) {
    return paletteState.backgroundColor;
  }
  return paletteState.foregroundColor;
}
