import { Context } from '../../overmind';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { brushRecall } from '../../brush/BrushRecall';
import { createPalette } from '../../components/palette/util';
import { rgbToHsv, hsvToRgb } from '../../tools/util/util';
import { DEFAULT_CYCLE_RATE, MIN_RANGE_SLOTS } from '../../algorithm/paletteRange';
import { cycleDriver } from '../../canvas/CycleDriver';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';

// Resizes the palette to exactly `colors` entries (the screen format's
// Number of Colors). Existing colors are kept up to the new count; growing
// fills the tail from the default palette for that depth. Everything that
// references a color id is clamped into the new bounds. No remapping of
// pixels already painted with dropped indices (yet) — they keep their
// stored index and will show whatever that slot holds if the palette grows
// back over them.
export const setNumberOfColors = (context: Context, colors: number): void => {
  const oldPalette = context.state.palette.palette;
  const defaults = createPalette(colors);
  const palette: { [id: string]: Color } = {};
  for (let i = 1; i <= colors; i++) {
    const id = String(i);
    palette[id] = oldPalette[id] ? { ...oldPalette[id] } : defaults[id];
  }
  context.state.palette.palette = palette;
  clampColorReferences(context, colors);
};

// Replaces the whole palette with the given colors (the palette extracted
// from a loaded image), resizing its depth to match — the browser-era
// equivalent of DPaint loading a picture's palette along with the picture.
export const replacePalette = (context: Context, colors: Color[]): void => {
  const palette: { [id: string]: Color } = {};
  colors.forEach((color, i): void => {
    palette[String(i + 1)] = { ...color };
  });
  context.state.palette.palette = palette;
  clampColorReferences(context, colors.length);
};

// Everything that refers to a color id gets clamped into the new depth.
function clampColorReferences(context: Context, colors: number): void {
  const clampId = (id: string): string => (Number(id) > colors ? String(colors) : id);
  context.state.palette.foregroundColorId = clampId(context.state.palette.foregroundColorId);
  context.state.palette.backgroundColorId = clampId(context.state.palette.backgroundColorId);
  context.state.paletteEditor.editedColorId = clampId(context.state.paletteEditor.editedColorId);
  context.state.palette.ranges = context.state.palette.ranges.map((range) => {
    if (!range) {
      return null;
    }
    if (Number(range.start) > colors) {
      return null; // entirely outside the new palette
    }
    return { ...range, end: clampId(range.end) };
  });
}

export const setForegroundColor = (context: Context, key: string): void => {
  context.state.palette.foregroundColorId = key;
  context.state.palette.foregroundRgb = null;
  context.actions.tool.activeToolToFGFillStyle();
  const brush = brushRecall.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor();
  }
};

// Sets a literal RGB foreground (e.g. picked from a true-color pixel of a
// loaded image). Cleared again by selecting any palette color.
export const setForegroundRgb = (context: Context, color: Color): void => {
  context.state.palette.foregroundRgb = { ...color };
  context.actions.tool.activeToolToFGFillStyle();
  const brush = brushRecall.current;
  if (brush instanceof CustomBrush) {
    brush.setFGColor();
  }
};

export const setBackgroundColor = (context: Context, key: string): void => {
  context.state.palette.backgroundColorId = key;
  const brush = brushRecall.current;
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
  const existing = context.state.palette.ranges[rangeIndex];
  context.state.palette.ranges[rangeIndex] = {
    start: lo,
    end: hi,
    rate: existing?.rate ?? DEFAULT_CYCLE_RATE,
    active: existing?.active ?? true,
    reverse: existing?.reverse ?? false,
  };
};

// Prunes empty slots above the six defaults — a slot that only existed
// because a loaded file carried it disappears once cleared — and keeps the
// editor's selection in bounds.
export const clearRange = (context: Context, rangeIndex: number): void => {
  const ranges = context.state.palette.ranges;
  ranges[rangeIndex] = null;
  while (ranges.length > MIN_RANGE_SLOTS && ranges[ranges.length - 1] === null) {
    ranges.pop();
  }
  const active = context.state.paletteEditor.activeRangeIndex;
  if (active !== null && active >= ranges.length) {
    context.state.paletteEditor.activeRangeIndex = ranges.length - 1;
  }
};

export interface SetRangeSettingsParams {
  rangeIndex: number;
  rate?: number;
  active?: boolean;
  reverse?: boolean;
}

// Updates a range slot's cycling settings in place. No-op on an unset slot —
// settings ride on a range, they don't create one.
export const setRangeSettings = (
  context: Context,
  { rangeIndex, rate, active, reverse }: SetRangeSettingsParams
): void => {
  const range = context.state.palette.ranges[rangeIndex];
  if (!range) {
    return;
  }
  if (rate !== undefined) {
    range.rate = rate;
  }
  if (active !== undefined) {
    range.active = active;
  }
  if (reverse !== undefined) {
    range.reverse = reverse;
  }
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

// Written by CycleDriver (and only it) whenever a range lands on a new whole
// cycling step; all zeros whenever cycling is off.
export const setCycleOffsets = (context: Context, offsets: number[]): void => {
  context.state.palette.cycleOffsets = offsets;
};

// DPaint's Tab: starts/stops the cycling animation. Off zeroes the offsets
// and repaints, snapping every range back to its base colors.
export const toggleCycling = (context: Context): void => {
  const on = !context.state.palette.cyclingOn;
  context.state.palette.cyclingOn = on;
  if (on) {
    cycleDriver.start();
  } else {
    cycleDriver.stop();
    context.state.palette.cycleOffsets = context.state.palette.ranges.map(() => 0);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }
};
