import { derived } from 'overmind';
import { GradientAxis, GradientFillStyle } from '../../algorithm/gradientFill';
import { activeRangeIndices } from '../../algorithm/paletteRange';
import type { OvermindState } from '../../overmind';

export type FillMode = 'solid' | 'gradient'; // 'brush' (pattern fill) later

// Snapshot/restore shape for the settings panel's Cancel — every field a
// requester control can change.
type Snapshot = {
  mode: FillMode;
  axis: GradientAxis;
  dither: number;
  jitter: number;
};

export type State = {
  mode: FillMode;
  axis: GradientAxis;
  dither: number; // 0..20, 0 = off (PyDPainter's Random dither scale)
  // Experimental: how far dither can push a pixel, as a percentage of a
  // band's own width (see gradientFill.ts) — exposed here so it can be
  // tuned/compared against DPaint further instead of staying a fixed
  // constant only reachable by editing code.
  jitter: number;
  settingsOpen: boolean;
  settingsSnapshot: Snapshot | null;
  // The effective gradient to paint with: null in solid mode, or in
  // gradient mode when the FG color isn't in any range (falls back to a
  // plain solid fill, same as DPaint — there's no "whole palette" gradient
  // to fall back to). DPaint's rule, not a picker in this dialog: the range
  // is whichever palette range slot contains the current FG color
  // (activeRangeIndices, the same lookup the Cycle/Shade/Blend paint
  // effects use) — so changing the range means changing the FG color, from
  // the toolbox palette, without needing this dialog open.
  readonly effectiveFillStyle: GradientFillStyle | null;
  // Whether the current FG color is inside a palette range at all —
  // independent of `mode`, so the dialog can warn about it (Gradient will
  // just paint solid otherwise) the moment a member color is picked, before
  // Gradient mode is even turned on.
  readonly foregroundInRange: boolean;
};

export const state: State = {
  mode: 'solid',
  axis: 'vertical',
  dither: 5,
  jitter: 17, // ~1/6, matches PyDPainter's HORIZ_FIT dither (see gradientFill.ts)
  settingsOpen: false,
  settingsSnapshot: null,
  foregroundInRange: derived(
    (_state: State, rootState: OvermindState): boolean =>
      !activeRangeIndices(
        rootState.palette.ranges,
        rootState.palette.foregroundColorId,
        rootState.palette.foregroundRgb !== null,
        rootState.palette.paletteArray.length
      ).wholePalette
  ),
  effectiveFillStyle: derived(
    (state: State, rootState: OvermindState): GradientFillStyle | null => {
      if (state.mode !== 'gradient') {
        return null;
      }
      const indices = activeRangeIndices(
        rootState.palette.ranges,
        rootState.palette.foregroundColorId,
        rootState.palette.foregroundRgb !== null,
        rootState.palette.paletteArray.length
      );
      if (indices.wholePalette) {
        return null;
      }
      return {
        axis: state.axis,
        rangeLow: indices.start + 1,
        rangeHigh: indices.end + 1,
        dither: state.dither,
        jitter: state.jitter,
      };
    }
  ),
};
