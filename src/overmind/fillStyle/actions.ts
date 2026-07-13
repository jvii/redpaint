import { Context } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { FillMode } from './state';

export const setMode = (context: Context, mode: FillMode): void => {
  context.state.fillStyle.mode = mode;
};

export const setAxis = (context: Context, axis: GradientAxis): void => {
  context.state.fillStyle.axis = axis;
};

export const setRangeIndex = (context: Context, rangeIndex: 0 | 1 | 2 | 3): void => {
  context.state.fillStyle.rangeIndex = rangeIndex;
};

export const setDither = (context: Context, dither: number): void => {
  context.state.fillStyle.dither = Math.max(0, Math.min(20, Math.round(dither)));
};

// Experimental: tunes the dither jitter half-width (dither * jitter% of a
// band — see gradientFill.ts). 13% matches PyDPainter/DPaint closely.
export const setJitter = (context: Context, jitter: number): void => {
  context.state.fillStyle.jitter = Math.max(0, Math.min(50, Math.round(jitter)));
};

export const openSettings = (context: Context): void => {
  const { mode, axis, rangeIndex, dither, jitter } = context.state.fillStyle;
  context.state.fillStyle.settingsSnapshot = { mode, axis, rangeIndex, dither, jitter };
  context.state.fillStyle.settingsOpen = true;
};

export const closeSettings = (context: Context): void => {
  context.state.fillStyle.settingsOpen = false;
  context.state.fillStyle.settingsSnapshot = null;
};

// Restore the values from when the panel was opened, then close.
export const cancelSettings = (context: Context): void => {
  const snapshot = context.state.fillStyle.settingsSnapshot;
  if (snapshot) {
    context.state.fillStyle.mode = snapshot.mode;
    context.state.fillStyle.axis = snapshot.axis;
    context.state.fillStyle.rangeIndex = snapshot.rangeIndex;
    context.state.fillStyle.dither = snapshot.dither;
    context.state.fillStyle.jitter = snapshot.jitter;
  }
  context.actions.fillStyle.closeSettings();
};
