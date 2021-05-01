import { Action } from 'overmind';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { brushHistory } from '../../brush/BrushHistory';

export const setForegroundColor: Action<string> = ({ state, actions }, key): void => {
  state.palette.foregroundColorId = key;
  actions.tool.activeToolToFGFillStyle();
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor();
  }
};

export const setBackgroundColor: Action<string> = ({ state }, key): void => {
  state.palette.backgroundColorId = key;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setBGColor();
  }
};

export interface EditColorParams {
  colorId: string;
  newColor: Color;
}

export const editColor: Action<EditColorParams> = ({ state }, editColorParams): void => {
  state.palette.palette[editColorParams.colorId] = editColorParams.newColor;
};
