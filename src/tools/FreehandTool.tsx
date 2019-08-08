import { Tool } from './Tool';
import { PaletteState } from '../components/palette/PaletteState';
import { drawDot, drawLineNoAliasing, getMousePos } from './util';
import { Color, EventHandlerParams } from '../types';

export class FreehandTool implements Tool {
  public onClick(): void {}

  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, state, dispatch } = params;
    console.log('onMouseMove FreehandTool ' + event.button);
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    if (event.buttons && state.freehandToolState.previousPosition) {
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        state.freehandToolState.previousPosition,
        position
      );
      dispatch({ type: 'freehandToolPrevious', point: position });
      setSyncPoint(Date.now());
      return;
    }
    dispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, dispatch } = params;
    console.log('onMouseDown FreehandTool ' + event.button);
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    drawDot(canvas, chooseColor(event, paletteState), position);
    dispatch({ type: 'freehandToolPrevious', point: position });
    setSyncPoint(Date.now());
  }

  public onMouseUp(params: EventHandlerParams): void {
    const { event, dispatch } = params;
    console.log('onMouseUp FreehandTool ' + event.button);
    dispatch({ type: 'freehandToolPrevious', point: null });
  }

  public onMouseEnter(params: EventHandlerParams): void {
    console.log('onMouseEnter FreehandTool');
  }

  public onMouseLeave(params: EventHandlerParams): void {
    console.log('onMouseLeave FreehandTool');
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
