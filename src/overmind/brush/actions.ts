import { Action } from 'overmind';
import { Brush } from '../../brush/Brush';
import { Mode, BuiltInBrushId } from './state';
import { CustomBrush } from '../../brush/CustomBrush';

export const setBrush: Action<Brush> = ({ state }, brush): void => {
  state.brush.brush = brush;
};

export const selectBuiltInBrush: Action<BuiltInBrushId> = (
  { state, actions },
  brushNumber
): void => {
  state.brush.selectedBuiltInBrushId = brushNumber;
  actions.brush.setBrush(state.brush.selectedBuiltInBrush);
  actions.brush.setMode('Color');
};

export const setMode: Action<Mode> = ({ state }, mode): void => {
  state.brush.mode = mode;
  if (state.brush.brush instanceof CustomBrush) {
    if (mode === 'Color') {
      state.brush.brush.setFGColor(state.palette.foregroundColor);
      state.brush.brush.setBGColor(state.palette.backgroundColor);
      state.brush.brush.toFGColor();
    } else if (mode === 'Matte') {
      state.brush.brush.setBGColor(state.palette.backgroundColor);
      state.brush.brush.toMatte();
    }
  }
};

export const toFGBrush: Action = ({ state }): void => {
  if (state.brush.mode === 'Color' && state.brush.brush instanceof CustomBrush) {
    state.brush.brush.toFGColor();
  }
  if (state.brush.mode === 'Matte' && state.brush.brush instanceof CustomBrush) {
    state.brush.brush.toMatte();
  }
};

export const toBGBrush: Action = ({ state }): void => {
  if (state.brush.brush instanceof CustomBrush) {
    state.brush.brush.toBGColor();
  }
};
