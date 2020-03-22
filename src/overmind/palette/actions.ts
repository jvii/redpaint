import { Action } from 'overmind';
import { CustomBrush } from '../../brush/CustomBrush';

export const setForegroundColor: Action<string> = ({ state, actions }, key): void => {
  state.palette.foregroundColorId = key;
  actions.tool.activeToolToFGFillStyle();
  const brush = state.brush.brush;
  if (brush instanceof CustomBrush) {
    brush.setFGColor(state.palette.foregroundColor);
  }
};

export const setBackgroundColor: Action<string> = ({ state }, key): void => {
  state.palette.backgroundColorId = key;
  const brush = state.brush.brush;
  if (brush instanceof CustomBrush) {
    brush.setBGColor(state.palette.backgroundColor);
  }
};
