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
  public onMouseLeave(): void {}
  public onMouseUp(): void {}

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
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
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    dispatch({ type: 'freehandToolPrevious', point: position });
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
