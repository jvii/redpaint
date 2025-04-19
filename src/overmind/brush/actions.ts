import { Context } from '../../overmind';
import { Mode, BuiltInBrushId, builtInBrushes } from './state';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';

export const selectBuiltInBrush = (context: Context, brushNumber: BuiltInBrushId): void => {
  context.state.brush.selectedBuiltInBrushId = brushNumber;
  brushHistory.set(builtInBrushes[brushNumber]);
  context.actions.brush.setMode('Color');
};

export const setMode = (context: Context, mode: Mode): void => {
  context.state.brush.mode = mode;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    if (mode === 'Color') {
      brush.setFGColor();
      brush.setBGColor();
      brush.toFGColor();
    } else if (mode === 'Matte') {
      brush.setBGColor();
      brush.toMatte();
    }
  }
};

export const toFGBrush = (context: Context): void => {
  const brush = brushHistory.current;
  if (context.state.brush.mode === 'Color' && brush instanceof CustomBrush) {
    brush.toFGColor();
  }
  if (context.state.brush.mode === 'Matte' && brush instanceof CustomBrush) {
    brush.toMatte();
  }
};

export const toBGBrush = (context: Context): void => {
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.toBGColor();
  }
};
