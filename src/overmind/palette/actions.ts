import { Action } from 'overmind';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { colorEquals } from '../../components/palette/util';
import { brushHistory } from '../../brush/BrushHistory';

export const setForegroundColor: Action<string> = ({ state, actions }, key): void => {
  state.palette.foregroundColorId = key;
  actions.tool.activeToolToFGFillStyle();
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor(state.palette.foregroundColor);
  }
};

export const setBackgroundColor: Action<string> = ({ state }, key): void => {
  state.palette.backgroundColorId = key;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setBGColor(state.palette.backgroundColor);
  }
};

export const findAndSetForegroundColor: Action<Color> = ({ state, actions }, color): void => {
  for (let i = 0; i < state.palette.paletteArray.length; i++) {
    if (colorEquals(state.palette.paletteArray[i], color)) {
      actions.palette.setForegroundColor(i.toString());
      return;
    }
  }
};

export const findAndSetBackgroundColor: Action<Color> = ({ state, actions }, color): void => {
  for (let i = 0; i < state.palette.paletteArray.length; i++) {
    if (colorEquals(state.palette.paletteArray[i], color)) {
      actions.palette.setBackgroundColor(i.toString());
      return;
    }
  }
};
