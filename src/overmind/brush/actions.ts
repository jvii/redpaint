import { Action } from 'overmind';
import { Brush } from '../../brush/Brush';

export const setBrush: Action<Brush> = ({ state }, brush) => {
  state.brush.brush = brush;
};
