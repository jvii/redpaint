import { Tool } from './Tool';
import { PaletteState } from '../components/palette/PaletteState';
import { Color, EventHandlerParams } from '../types';
import { drawLineNoAliasing, getMousePos } from './util';

export class LineTool implements Tool {
  public onClick(params: EventHandlerParams): void {
    console.log('onClick LineTool');
  }

  public onContextMenu(params: EventHandlerParams): void {
    const { event } = params;
    event.preventDefault();
  }

  public onMouseMove(params: EventHandlerParams): void {
    console.log('onMouseMove LineTool');
  }

  public onMouseUp(params: EventHandlerParams): void {
    const { event, canvas, paletteState, setSyncPoint, state, dispatch } = params;
    console.log('onMouseUp LineTool ' + event.button);
    if (!canvas) {
      return;
    }
    if (state.lineToolState.startingPosition) {
      const position = getMousePos(canvas, event);
      drawLineNoAliasing(
        canvas,
        chooseColor(event, paletteState),
        state.lineToolState.startingPosition,
        position
      );
      setSyncPoint(Date.now());
      dispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onMouseDown(params: EventHandlerParams): void {
    const { event, canvas, dispatch } = params;
    console.log('onMouseDown LineTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    dispatch({ type: 'lineToolStart', point: position });
  }

  public onMouseLeave(params: EventHandlerParams): void {
    const { event } = params;
    console.log('onMouseLeave LineTool ' + event.button);
  }

  public onMouseEnter(params: EventHandlerParams): void {
    console.log('onMouseEnter LineTool');
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
