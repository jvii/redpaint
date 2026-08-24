import { Context } from '../../overmind';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { PaletteRange } from './state';
import { brushRecall } from '../../brush/BrushRecall';
import { createPalette } from '../../components/palette/util';
import { rgbToHsv, hsvToRgb } from '../../algorithm/color';
import { DEFAULT_CYCLE_RATE, MIN_RANGE_SLOTS } from '../../algorithm/paletteRange';
import { cycleDriver, refreshCyclePalettes } from '../../canvas/CycleDriver';
import { plainPalette, paletteEquals } from '../../algorithm/imageColors';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';

// Resizes the palette to exactly `colors` entries (the screen format's Number
// of Colors). Existing colors are kept up to the new count; growing fills the
// tail from the default palette for that depth, and every color id is clamped
// into the new bounds. Pixels painted with a dropped index are not remapped:
// they keep it, and show whatever the slot holds if the palette grows back.
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

// Replaces the whole palette with the given colors (the palette extracted from
// a loaded image), resizing its depth to match: the browser-era equivalent of
// DPaint loading a picture's palette along with the picture. The cycling ranges
// as a whole, for the paths that bring a document's own set with it (an ILBM's
// cycle chunks, a restored autosave) rather than editing one.
export const replaceRanges = (context: Context, ranges: (PaletteRange | null)[]): void => {
  context.state.palette.ranges = ranges;
};

// DPaint's Picture > Color control pair (UseBrPalette and RestorePalette,
// CURBRUSH.C:30 and PRISM.C:331). A brush holds indices, so changing the
// palette recolors it; this moves the picture's palette to the brush instead
// of the brush to the palette, which is the other way out of that (the first
// being Remap). The picture's own pixels are indices too, so they recolor —
// that is the trade, and Restore puts it back.
export const useBrushPalette = (context: Context): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || !brush.palette) {
    return;
  }
  context.actions.palette.rememberPreviousPalette();
  keepingPicturePalette(context, () => {
    context.actions.palette.replacePalette(brush.palette);
  });
  pushPaletteToGl();
};

// Stashes the palette a brush's is about to displace, so Restore can put it
// back. Called from the two places that happens: here, and the brush load
// requester's Use Brush Palette, which does the same thing before the brush is
// even installed.
//
// Deliberately not from everything that replaces a palette. DPaint stashes on
// picture load too (DPIO.C:99), but an undo entry here carries the palette with
// it, so a load or a conform is already one undo away. Loading a brush changes
// no pixels and takes no undo point, which makes it the one wholesale palette
// replacement with no other way back.
// DPaint's Default Palette, the item below Restore in the same submenu:
// defPals[curDepth], the built-in palette for however many colors the screen
// has. Its DefaultPalette() is InitPalette() then LoadCMap, and InitPalette is
// GetColors(prevColors) — so it stashes what it replaces and Restore undoes it,
// which is the same rule a brush palette follows here and for the same reason:
// it moves the palette without touching a pixel, so it takes no undo point and
// nothing else can put it back.
export const defaultPalette = (context: Context): void => {
  // The raw map, not the paletteArray derived: an action must not read one
  // (test/overmind/derivedsInActions.test.ts).
  const current = plainPalette(Object.values(context.state.palette.palette));
  const defaults = plainPalette(Object.values(createPalette(current.length)));
  if (paletteEquals(defaults, current)) {
    return;
  }
  context.actions.palette.rememberPreviousPalette();
  keepingPicturePalette(context, () => {
    context.actions.palette.replacePalette(defaults);
  });
  pushPaletteToGl();
};

export const rememberPreviousPalette = (context: Context): void => {
  context.state.palette.previousPalette = plainPalette(
    Object.values(context.state.palette.palette)
  );
};

// Idempotent, and it keeps the record: DPaint's RestorePalette is a plain
// LoadCMap(prevColors) that neither clears nor swaps, so calling it twice does
// nothing the once did not.
export const restorePalette = (context: Context): void => {
  const previous = context.state.palette.previousPalette;
  if (!previous) {
    return;
  }
  keepingPicturePalette(context, () => {
    context.actions.palette.replacePalette(previous);
  });
  pushPaletteToGl();
};

// The mirror of those three: pixels freshly indexed against the palette that is
// already current, so what they mean has changed without the palette moving.
// An image load that remaps into the current palette, or that loads true-color
// pixels, replaces no palette and so would otherwise leave this describing the
// document that was open before.
export const syncPicturePalette = (context: Context): void => {
  context.state.palette.picturePalette = plainPalette(
    Object.values(context.state.palette.palette)
  );
};

// The three that move the palette without re-indexing the picture. What the
// pixels mean is unchanged by any of them, so it survives the replacement —
// that difference is exactly what Remap reads.
function keepingPicturePalette(context: Context, change: () => void): void {
  const meaning = context.state.palette.picturePalette;
  change();
  context.state.palette.picturePalette = meaning;
}

// The GL palette textures do not watch Overmind, so a palette swapped out from
// under the picture has to be handed to them (the same push the brush load
// requester makes after adopting a file's palette).
function pushPaletteToGl(): void {
  paintingCanvasController.updatePalette();
  overlayCanvasController.updatePalette();
}

export const replacePalette = (context: Context, colors: Color[]): void => {
  const palette: { [id: string]: Color } = {};
  colors.forEach((color, i): void => {
    palette[String(i + 1)] = { ...color };
  });
  context.state.palette.palette = palette;
  // The picture's pixels mean the palette that is current, unless something
  // deliberately parts the two — From Brush, Default and Restore each put this
  // back afterwards, and a hand edit never comes through here at all, editing
  // slots in place. Following by default rather than being updated at each of
  // the several places a palette gets installed, so a path added later is right
  // without having to know about this.
  context.state.palette.picturePalette = plainPalette(colors);
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
  // Before the change lands: a line still being typed was typed in the colour
  // in force at the time, and the text tool re-renders it from current state on
  // every repaint, so it would otherwise recolour along its whole length.
  // Committing here leaves it in the colour it was typed in and lets typing
  // carry on in the new one — DPaint's own behaviour, which fell out of it
  // committing each character as it went.
  context.state.toolbox.activeTool.commitPending?.();
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

// Prunes empty slots above the six defaults (a slot that only existed because a
// loaded file carried it disappears once cleared), and keeps the editor's
// selection in bounds.
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

// Updates a range slot's cycling settings in place. No-op on an unset slot:
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

// DPaint's Ex(change): swap the colors of two palette slots. Fresh copies, not
// moved references: proxy-state-tree rejects re-inserting an object that's
// already tracked at another path.
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
// HSV, not RGB: a blue-to-yellow spread passes through greens instead of
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
    refreshCyclePalettes(); // same refresh a cycling tick does, with zeroes
  }
};
