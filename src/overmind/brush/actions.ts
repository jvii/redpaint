import { Action } from 'overmind';
import { Brush } from '../../brush/Brush';
import { Mode, BuiltInBrushId, builtInBrushes } from './state';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';

export const setBrush: Action<Brush> = ({ state }, brush): void => {
  brushHistory.set(brush);
};

export const selectBuiltInBrush: Action<BuiltInBrushId> = (
  { state, actions },
  brushNumber
): void => {
  state.brush.selectedBuiltInBrushId = brushNumber;
  actions.brush.setBrush(builtInBrushes[brushNumber]);
  actions.brush.setMode('Color');
};

export const setMode: Action<Mode> = ({ state }, mode): void => {
  state.brush.mode = mode;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    if (mode === 'Color') {
      brush.setFGColor(state.palette.foregroundColor);
      brush.setBGColor(state.palette.backgroundColor);
      brush.toFGColor();
    } else if (mode === 'Matte') {
      brush.setBGColor(state.palette.backgroundColor);
      brush.toMatte();
    }
  }
};

export const toFGBrush: Action = ({ state }): void => {
  const brush = brushHistory.current;
  if (state.brush.mode === 'Color' && brush instanceof CustomBrush) {
    brush.toFGColor();
  }
  if (state.brush.mode === 'Matte' && brush instanceof CustomBrush) {
    brush.toMatte();
  }
};

export const toBGBrush: Action = ({ state }): void => {
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.toBGColor();
  }
};
