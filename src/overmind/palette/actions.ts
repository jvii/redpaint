import { Context } from '../../overmind'
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { brushHistory } from '../../brush/BrushHistory';

export const setForegroundColor = (context: Context, key: string): void => {
  context.state.palette.foregroundColorId = key;
  context.actions.tool.activeToolToFGFillStyle();
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor();
  }
};

export const setBackgroundColor = (context: Context, key: string): void => {
  context.state.palette.backgroundColorId = key;
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setBGColor();
  }
};

export interface EditColorParams {
  colorId: string;
  newColor: Color;
}

export const editColor = (context: Context, editColorParams: EditColorParams): void => {
  context.state.palette.palette[editColorParams.colorId] = editColorParams.newColor;
};
