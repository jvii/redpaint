import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PaletteState } from '../components/palette/PaletteState';
import { getMousePos } from './util';

export class ZoomInitialPointSelectorTool implements Tool {
  public onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onClick ZoomInitialPointSelectorTool');
    if (!canvas) {
      return;
    }
    const position = getMousePos(canvas, event);
    dispatch({ type: 'zoomInitialPoint', point: position });
  }

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
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    paletteState: PaletteState,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseDown LineTool');
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
