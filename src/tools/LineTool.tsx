import { Tool } from './Tool';
import { ToolState, Action } from './ToolState';
import { PointerState } from '../types';
import { drawLine } from './util';

export class LineTool implements Tool {
  public use(
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
      drawLine(canvas, state.lineToolState.startingPosition, pointerState.currentPosition);
      dispatch({ type: 'lineToolStart', point: null });
    }
  }
}
