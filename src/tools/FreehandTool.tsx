import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PaletteState } from '../components/palette/PaletteState';
import { drawDot, drawLineNoAliasing, getMousePos } from './util';
import { Color } from '../types';

export class FreehandTool implements Tool {
  public onClick(): void {}
  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    setEdited: React.Dispatch<React.SetStateAction<number>>,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
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
      setEdited(Date.now());
      return;
    }
    dispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseDown FreehandTool ' + event.button);
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    drawDot(canvas, chooseColor(event, paletteState), position);
    dispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseUp FreehandTool ' + event.button);
    dispatch({ type: 'freehandToolPrevious', point: null });
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseEnter FreehandTool ' + event.button);
  }

  public onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseLeave FreehandTool ' + event.button);
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
