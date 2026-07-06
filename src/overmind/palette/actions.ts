import { Context } from '../../overmind'
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { brushHistory } from '../../brush/BrushHistory';
import { rgbToHsv, hsvToRgb } from '../../tools/util/util';

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

export interface CopyColorParams {
  fromId: string;
  toId: string;
}

// DPaint's Copy: overwrite one palette slot with another slot's color.
export const copyColor = (context: Context, { fromId, toId }: CopyColorParams): void => {
  context.state.palette.palette[toId] = { ...context.state.palette.palette[fromId] };
};

export interface SwapColorsParams {
  aId: string;
  bId: string;
}

// DPaint's Ex(change): swap the colors of two palette slots. Fresh copies,
// not moved references — proxy-state-tree rejects re-inserting an object
// that's already tracked at another path.
export const swapColors = (context: Context, { aId, bId }: SwapColorsParams): void => {
  const a = { ...context.state.palette.palette[aId] };
  context.state.palette.palette[aId] = { ...context.state.palette.palette[bId] };
  context.state.palette.palette[bId] = a;
};

export interface SpreadParams {
  fromId: string;
  toId: string;
}

// DPaint's Spread (PALETTE.C, MO_SPREAD): re-colors the palette slots
// strictly between the two endpoints as an HSV interpolation from one
// endpoint color to the other (the endpoints themselves are unchanged).
// HSV, not RGB — a blue-to-yellow spread passes through greens instead of
// grey. Two faithful details:
//  - an achromatic endpoint has no meaningful hue (grey) or saturation
//    (black), so those "undefined" components are borrowed from the other
//    endpoint rather than interpolated from an arbitrary value;
//  - the hue takes the shorter arc around the color circle, with DPaint's
//    deliberate bias ("Favor Y..G..B over Y..R..B arc"): only wrap when
//    the direct arc exceeds MAIN_ARC (210°, their 128 + 256/12 scaled to
//    degrees), so e.g. yellow-to-blue runs through green, not red.
export const spread = (context: Context, { fromId, toId }: SpreadParams): void => {
  const from = Number(fromId);
  const to = Number(toId);
  const steps = Math.abs(to - from);
  if (steps < 2) {
    return; // no slots in between
  }
  const direction = to > from ? 1 : -1;

  const first = rgbToHsv(context.state.palette.palette[fromId]);
  const last = rgbToHsv(context.state.palette.palette[toId]);
  if (last.s === 0) {
    last.h = first.h;
  }
  if (first.s === 0) {
    first.h = last.h;
  }
  if (last.v === 0) {
    last.s = first.s;
  }
  if (first.v === 0) {
    first.s = last.s;
  }

  const MAIN_ARC = 210;
  let dh = last.h - first.h;
  if (dh > MAIN_ARC) {
    dh -= 360;
  }
  if (dh < -MAIN_ARC) {
    dh += 360;
  }
  const ds = last.s - first.s;
  const dv = last.v - first.v;

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    context.state.palette.palette[String(from + i * direction)] = hsvToRgb({
      h: (((first.h + dh * t) % 360) + 360) % 360,
      s: first.s + ds * t,
      v: first.v + dv * t,
    });
  }
};
