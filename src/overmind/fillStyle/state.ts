import { derived } from 'overmind';
import { GradientAxis, GradientFillStyle } from '../../algorithm/gradientFill';
import type { OvermindState } from '../../overmind';

export type FillMode = 'solid' | 'gradient'; // 'brush' (pattern fill) later

// Snapshot/restore shape for the settings panel's Cancel — every field a
// requester control can change.
type Snapshot = {
  mode: FillMode;
  axis: GradientAxis;
  rangeIndex: 0 | 1 | 2 | 3;
  dither: number;
  rangeOverride: boolean;
  rangeLow: number;
  rangeHigh: number;
  ditherDivisor: number;
};

export type State = {
  mode: FillMode;
  axis: GradientAxis;
  rangeIndex: 0 | 1 | 2 | 3; // which of the palette's 4 ranges
  dither: number; // 0..20, 0 = off (PyDPainter's Random dither scale)
  // Experimental direct range controls (see FillStyleSettings' "Range
  // (Experimental)" fieldset) — bypass rangeIndex/the palette's configured
  // ranges entirely when on, for trying arbitrary spans without predefining
  // a range first. rangeLow/rangeHigh hold their values regardless of
  // whether the override is active, so flipping it back on restores where
  // the sliders were left.
  rangeOverride: boolean;
  rangeLow: number;
  rangeHigh: number;
  // Experimental: PyDPainter's dither jitter half-width is dither/8 of a
  // band (ditherDivisor=4, see gradientFill.ts) — exposed here so it can be
  // tuned/compared against DPaint further instead of staying a fixed
  // constant only reachable by editing code.
  ditherDivisor: number;
  settingsOpen: boolean;
  settingsSnapshot: Snapshot | null;
  // The effective gradient to paint with: null in solid mode, or when the
  // selected range slot isn't configured yet (falls back to solid — this
  // module's explicit version of DPaint's "outside every range" fallback).
  readonly effectiveFillStyle: GradientFillStyle | null;
};

export const state: State = {
  mode: 'solid',
  axis: 'vertical',
  rangeIndex: 0,
  dither: 0,
  rangeOverride: false,
  rangeLow: 1,
  rangeHigh: 8,
  ditherDivisor: 4,
  settingsOpen: false,
  settingsSnapshot: null,
  effectiveFillStyle: derived((state: State, rootState: OvermindState): GradientFillStyle | null => {
    if (state.mode !== 'gradient') {
      return null;
    }
    let rangeLow: number;
    let rangeHigh: number;
    if (state.rangeOverride) {
      rangeLow = state.rangeLow;
      rangeHigh = state.rangeHigh;
    } else {
      const range = rootState.palette.ranges[state.rangeIndex];
      if (!range) {
        return null;
      }
      rangeLow = Number(range.start);
      rangeHigh = Number(range.end);
    }
    return {
      axis: state.axis,
      rangeLow,
      rangeHigh,
      dither: state.dither,
      ditherDivisor: state.ditherDivisor,
    };
  }),
};
