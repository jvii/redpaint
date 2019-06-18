import { PointerState, Tool } from '../types';
import { ToolState, Action } from './ToolState';

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
      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(
        state.lineToolState.startingPosition.x,
        state.lineToolState.startingPosition.y
      );
      ctx.lineTo(
        pointerState.currentPosition.x,
        pointerState.currentPosition.y
      );
      ctx.stroke();

      dispatch({ type: 'lineToolStart', point: null });
    }
  }
}
