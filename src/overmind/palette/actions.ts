import { Context } from '../../overmind'
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { brushHistory } from '../../brush/BrushHistory';

export const setForegroundColor = (context: Context, key: string): void => {
  context.state.palette.foregroundColorId = key;
  context.state.palette.foregroundRgb = null;
  context.actions.tool.activeToolToFGFillStyle();
  const brush = brushHistory.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor();
  }
};

// Sets a literal RGB foreground (e.g. picked from a true-color pixel of a
// loaded image). Cleared again by selecting any palette color.
export const setForegroundRgb = (context: Context, color: Color): void => {
  context.state.palette.foregroundRgb = { ...color };
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

export interface SetRangeParams {
  rangeIndex: number;
  start: string;
  end: string;
}

// Range endpoints are normalized to id order so the range always reads
// low..high regardless of which endpoint was set first.
export const setRange = (context: Context, { rangeIndex, start, end }: SetRangeParams): void => {
  const [lo, hi] = Number(start) <= Number(end) ? [start, end] : [end, start];
  context.state.palette.ranges[rangeIndex] = { start: lo, end: hi };
};

export const clearRange = (context: Context, rangeIndex: number): void => {
  context.state.palette.ranges[rangeIndex] = null;
};
