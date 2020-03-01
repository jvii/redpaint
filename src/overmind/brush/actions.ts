import { Action } from 'overmind';
import { Brush } from '../../brush/Brush';
import { builtInBrushes, BuiltInBrushId } from '../../brush/BuiltInBrushes';
import { Mode } from './state';

export const setBrush: Action<Brush> = ({ state }, brush): void => {
  state.brush.brush = brush;
};

export const selectBuiltInBrush: Action<BuiltInBrushId> = (
  { state, actions },
  brushNumber
): void => {
  state.brush.selectedBuiltInBrushId = brushNumber;
  actions.brush.setBrush(builtInBrushes[brushNumber]);
};

export const setMode: Action<Mode> = ({ state }, mode): void => {
  state.brush.mode = mode;
};
