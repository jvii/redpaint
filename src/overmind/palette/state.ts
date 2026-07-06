import { Color, PaintColor } from '../../types';
import { createPalette } from '../../components/palette/util';
import { derived } from 'overmind';

// Pure helper shared by the derived below and by actions. NOTE: reading
// derived state from inside Overmind actions returns undefined with the
// bundled Overmind build, so actions must compute paint colors from the raw
// fields via these helpers.
export function foregroundPaintColorOf(state: {
  foregroundRgb: Color | null;
  foregroundColorId: string;
}): PaintColor {
  return state.foregroundRgb
    ? { kind: 'rgb', color: { r: state.foregroundRgb.r, g: state.foregroundRgb.g, b: state.foregroundRgb.b } }
    : { kind: 'index', colorNumber: Number(state.foregroundColorId) };
}

export function backgroundPaintColorOf(state: { backgroundColorId: string }): PaintColor {
  return { kind: 'index', colorNumber: Number(state.backgroundColorId) };
}

// A contiguous span of palette slots (inclusive, by color id). DPaint's
// Palette Window defines up to four of these; Color Cycling, Gradient Fill
// and the Blend/Shade painting modes all key off "the range containing
// color X". Cycling and gradient fill are future features — this is just
// the shared data model, editable from the palette editor.
export type PaletteRange = {
  start: string;
  end: string;
};

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
  // Fixed 4 slots (DPaint's Range 1..4), unset slots are null.
  ranges: (PaletteRange | null)[];
  readonly foregroundColor: Color;
  readonly backgroundColor: Color;
  readonly foregroundPaintColor: PaintColor;
  readonly backgroundPaintColor: PaintColor;
};

export const state: State = {
  palette: createPalette(32),
  paletteArray: derived((state: State) => Object.values(state.palette)),
  foregroundColorId: '20',
  backgroundColorId: '1',
  foregroundRgb: null,
  ranges: [null, null, null, null],
  foregroundColor: derived(
    (state: State) => state.foregroundRgb ?? state.palette[state.foregroundColorId]
  ),
  backgroundColor: derived((state: State) => state.palette[state.backgroundColorId]),
  foregroundPaintColor: derived((state: State): PaintColor => foregroundPaintColorOf(state)),
  backgroundPaintColor: derived((state: State): PaintColor => backgroundPaintColorOf(state)),
};
