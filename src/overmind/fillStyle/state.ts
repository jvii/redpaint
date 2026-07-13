import { derived } from 'overmind';
import { GradientAxis, GradientFillStyle } from '../../algorithm/gradientFill';
import type { OvermindState } from '../../overmind';

export type FillMode = 'solid' | 'gradient'; // 'brush' (pattern fill) later

export type State = {
  mode: FillMode;
  axis: GradientAxis;
  rangeIndex: 0 | 1 | 2 | 3; // which of the palette's 4 ranges
  dither: number; // 0..20, 0 = off (PyDPainter's Random dither scale)
  settingsOpen: boolean;
  settingsSnapshot: { mode: FillMode; axis: GradientAxis; rangeIndex: 0 | 1 | 2 | 3; dither: number } | null;
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
  settingsOpen: false,
  settingsSnapshot: null,
  effectiveFillStyle: derived((state: State, rootState: OvermindState): GradientFillStyle | null => {
    if (state.mode !== 'gradient') {
      return null;
    }
    const range = rootState.palette.ranges[state.rangeIndex];
    if (!range) {
      return null;
    }
    return {
      axis: state.axis,
      rangeLow: Number(range.start),
      rangeHigh: Number(range.end),
      dither: state.dither,
    };
  }),
};
