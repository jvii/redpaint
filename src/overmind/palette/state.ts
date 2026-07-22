import { Color, PaintColor } from '../../types';
import { createPalette } from '../../components/palette/util';
import { derived } from 'overmind';
import { CycleRange, DEFAULT_CYCLE_RATE } from '../../algorithm/paletteRange';
import { cycledPalette } from '../../algorithm/cycle';

// Pure helper shared by the derived below and by actions. NOTE: reading
// derived state from inside Overmind actions returns undefined with the
// bundled Overmind build, so actions must compute paint colors from the raw
// fields via these helpers.
export function foregroundPaintColorOf(state: {
  foregroundRgb: Color | null;
  foregroundColorId: string;
}): PaintColor {
  return state.foregroundRgb
    ? {
        kind: 'rgb',
        color: { r: state.foregroundRgb.r, g: state.foregroundRgb.g, b: state.foregroundRgb.b },
      }
    : { kind: 'index', colorNumber: Number(state.foregroundColorId) };
}

export function backgroundPaintColorOf(state: { backgroundColorId: string }): PaintColor {
  return { kind: 'index', colorNumber: Number(state.backgroundColorId) };
}

// A contiguous span of palette slots with cycling settings (see
// src/algorithm/paletteRange.ts). Color Cycling, Gradient Fill and the
// Blend/Shade painting modes all key off "the range containing color X".
export type PaletteRange = CycleRange;

export type State = {
  palette: {
    [id: string]: Color; // id is the color index (integer as string), starting from "1"
  };
  readonly paletteArray: Color[];
  foregroundColorId: string;
  backgroundColorId: string;
  // When set, the foreground is a literal RGB color (e.g. picked from a loaded
  // image) instead of the selected palette color. Selecting a palette color
  // clears it. The background stays palette-indexed (it doubles as the clear
  // color and the brush transparency marker).
  foregroundRgb: Color | null;
  // Range slots, minimum six, uncapped (see the initial value below).
  ranges: (PaletteRange | null)[];
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
  readonly foregroundPaintColor: PaintColor;
  readonly backgroundPaintColor: PaintColor;
  // Color cycling animation (docs/color-cycling.md). Display-only: while
  // cycling, the GL palette textures and the display* deriveds rotate, but
  // palette/ranges above never change. cycleOffsets tracks ranges by index
  // (all zeros while cycling is off) and is written only by CycleDriver.
  cyclingOn: boolean;
  cycleOffsets: number[];
  // What the UI shows for each slot: the base palette with each cycling
  // range rotated by its current offset. Components read these; canvas
  // controllers compute the same rotation from the raw fields instead
  // (deriveds read as undefined inside actions — see the note above).
  readonly displayPalette: { [id: string]: Color };
  readonly displayForegroundColor: Color;
  readonly displayBackgroundColor: Color;
};

export const state: State = {
  palette: createPalette(32),
  paletteArray: derived((state: State) => Object.values(state.palette)),
  foregroundColorId: '2',
  backgroundColorId: '1',
  foregroundRgb: null,
  // Range slots (DPaint's Range 1..4, ours defaults to six), unset slots are
  // null. The list grows past six when a loaded IFF carries more CRNG
  // chunks. Range 1 defaults to the grey ramp (the default 32-color
  // palette's last 12 entries), matching DPaint's own default range.
  ranges: [
    { start: '21', end: '32', rate: DEFAULT_CYCLE_RATE, active: true, reverse: false },
    null,
    null,
    null,
    null,
    null,
  ],
  foregroundColor: derived(
    (state: State) => state.foregroundRgb ?? state.palette[state.foregroundColorId]
  ),
  backgroundColor: derived((state: State) => state.palette[state.backgroundColorId]),
  foregroundPaintColor: derived((state: State): PaintColor => foregroundPaintColorOf(state)),
  backgroundPaintColor: derived((state: State): PaintColor => backgroundPaintColorOf(state)),
  cyclingOn: false,
  cycleOffsets: [0, 0, 0, 0, 0, 0],
  displayPalette: derived((state: State) =>
    cycledPalette(state.palette, state.ranges, state.cycleOffsets)
  ),
  displayForegroundColor: derived(
    (state: State) => state.foregroundRgb ?? state.displayPalette[state.foregroundColorId]
  ),
  displayBackgroundColor: derived((state: State) => state.displayPalette[state.backgroundColorId]),
};
