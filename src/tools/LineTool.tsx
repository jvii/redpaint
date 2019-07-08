import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PointerState, Color, Point } from '../types';
import { drawLine } from './util';

export class LineTool implements Tool {
  public use(
    color: Color,
    pointerState: PointerState,
    canvas: HTMLCanvasElement,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    if (!pointerState.currentPosition) {
      return;
    }
    if (pointerState.isMouseDown && !state.lineToolState.startingPosition) {
      dispatch({ type: 'lineToolStart', point: pointerState.currentPosition });
      return;
    }
    if (!state.lineToolState.startingPosition) {
      return;
    }

    if (!pointerState.isMouseDown && state.lineToolState.startingPosition) {
      drawLine(canvas, color, state.lineToolState.startingPosition, pointerState.currentPosition);
      dispatch({ type: 'lineToolStart', point: null });
    }
  }

  public onClick(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onClick LineTool');
    console.log('state: ' + state.lineToolState.startingPosition);
    const position: Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
    dispatch({ type: 'lineToolStart', point: position });
  }

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseMove LineTool');
  }

  public onMouseUp(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseUp LineTool');
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseDown LineTool');
  }

  public onMouseLeave(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseLeave LineTool');
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    console.log('onMouseEnter LineTool');
  }
}
