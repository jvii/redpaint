import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { Color, Point } from '../types';
import { drawLine, drawDot } from './util';

export class FreehandTool implements Tool {
  public onClick(): void {}
  public onMouseLeave(): void {}
  public onMouseUp(): void {}

  public onMouseMove(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    const position: Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
    if (event.buttons === 1 && canvas && state.freehandToolState.previousPosition) {
      drawLine(canvas, color, state.freehandToolState.previousPosition, position);
    }
    dispatch({ type: 'freehandToolPrevious', point: position });
  }

  public onMouseDown(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    const position: Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
    if (canvas) {
      drawDot(canvas, color, position);
    }
  }

  public onMouseEnter(
    event: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
    canvas: HTMLCanvasElement | null,
    color: Color,
    state: ToolState,
    dispatch: React.Dispatch<Action>
  ): void {
    const position: Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
    dispatch({ type: 'freehandToolPrevious', point: position });
  }
}
