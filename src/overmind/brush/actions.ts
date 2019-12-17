import { Action } from 'overmind';
import { Brush } from '../../brush/Brush';
import { builtInBrushes, BuiltInBrushId } from '../../brush/BuiltInBrushes';

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
