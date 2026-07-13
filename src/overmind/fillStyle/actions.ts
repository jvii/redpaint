import { Context } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { FillMode } from './state';

export const setMode = (context: Context, mode: FillMode): void => {
  context.state.fillStyle.mode = mode;
};

export const setAxis = (context: Context, axis: GradientAxis): void => {
  context.state.fillStyle.axis = axis;
};

// Picking a preset range wins over the experimental direct override, so the
// two controls don't fight — the override only takes effect again if the
// Range Low/High sliders are touched afterward.
export const setRangeIndex = (context: Context, rangeIndex: 0 | 1 | 2 | 3): void => {
  context.state.fillStyle.rangeIndex = rangeIndex;
  context.state.fillStyle.rangeOverride = false;
};

export const setDither = (context: Context, dither: number): void => {
  context.state.fillStyle.dither = Math.max(0, Math.min(20, Math.round(dither)));
};

// Experimental: direct range bounds, bypassing the palette's configured
// ranges. Touching either slider switches to the override.
export const setRangeLow = (context: Context, rangeLow: number): void => {
  context.state.fillStyle.rangeLow = Math.round(rangeLow);
  context.state.fillStyle.rangeOverride = true;
};

export const setRangeHigh = (context: Context, rangeHigh: number): void => {
  context.state.fillStyle.rangeHigh = Math.round(rangeHigh);
  context.state.fillStyle.rangeOverride = true;
};

// Experimental: tunes the dither jitter half-width (dither/(2*divisor) of a
// band — see gradientFill.ts). 4 matches PyDPainter/DPaint.
export const setDitherDivisor = (context: Context, ditherDivisor: number): void => {
  context.state.fillStyle.ditherDivisor = Math.max(1, Math.min(10, Math.round(ditherDivisor)));
};

export const openSettings = (context: Context): void => {
  const { mode, axis, rangeIndex, dither, rangeOverride, rangeLow, rangeHigh, ditherDivisor } =
    context.state.fillStyle;
  context.state.fillStyle.settingsSnapshot = {
    mode,
    axis,
    rangeIndex,
    dither,
    rangeOverride,
    rangeLow,
    rangeHigh,
    ditherDivisor,
  };
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
    context.state.fillStyle.rangeOverride = snapshot.rangeOverride;
    context.state.fillStyle.rangeLow = snapshot.rangeLow;
    context.state.fillStyle.rangeHigh = snapshot.rangeHigh;
    context.state.fillStyle.ditherDivisor = snapshot.ditherDivisor;
  }
  context.actions.fillStyle.closeSettings();
};
