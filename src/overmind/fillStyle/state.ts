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
  jitter: number;
};

export type State = {
  mode: FillMode;
  axis: GradientAxis;
  rangeIndex: 0 | 1 | 2 | 3; // which of the palette's 4 ranges
  dither: number; // 0..20, 0 = off (PyDPainter's Random dither scale)
  // Experimental: how far dither can push a pixel, as a percentage of a
  // band's own width (see gradientFill.ts) — exposed here so it can be
  // tuned/compared against DPaint further instead of staying a fixed
  // constant only reachable by editing code.
  jitter: number;
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
  jitter: 13,
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
      jitter: state.jitter,
    };
  }),
};
