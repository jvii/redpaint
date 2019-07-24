import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PaletteState } from '../components/palette/PaletteState';
import { Color } from '../types';
import { drawLineNoAliasing, getMousePos } from './util';

export class LineTool implements Tool {
  public onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onClick LineTool');
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseMove LineTool');
  }

  public onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
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
      dispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseDown LineTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    dispatch({ type: 'lineToolStart', point: position });
  }

  public onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseLeave LineTool ' + event.button);
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
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
