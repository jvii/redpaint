import { Action } from 'overmind';
import { CustomBrush } from '../../brush/CustomBrush';

export const setForegroundColor: Action<string> = ({ state, actions }, key): void => {
  state.palette.foregroundColorId = key;
  actions.tool.activeToolToFGFillStyle();
  if (state.brush.brush instanceof CustomBrush) {
    state.brush.brush.setFGColor(state.palette.foregroundColor);
  }
};

export const setBackgroundColor: Action<string> = ({ state }, key): void => {
  state.palette.backgroundColorId = key;
  if (state.brush.brush instanceof CustomBrush) {
    state.brush.brush.setBGColor(state.palette.backgroundColor);
  }
};
