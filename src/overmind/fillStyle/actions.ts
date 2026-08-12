import { Context } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { FillMode } from './state';
import { brushRecall } from '../../brush/BrushRecall';
import { patternFillStore } from '../../brush/PatternFill';

export const setMode = (context: Context, mode: FillMode): void => {
  context.state.fillStyle.mode = mode;
};

// DPaint's "From Brush": snapshots the current brush (built-in or custom, see
// PatternFill.ts) into the Pattern fill slot. The button is only enabled while
// Fill is already set to Pattern (FillStyleSettings.tsx), so `mode` is always
// 'brush' by the time this runs; set here anyway so the action stays correct on
// its own. No-ops if there's nothing to capture (PixelBrush; no brush has ever
// been picked yet).
export const captureFromBrush = (context: Context): void => {
  if (!patternFillStore.captureFrom(brushRecall.current)) {
    return;
  }
  context.state.fillStyle.hasPattern = true;
  context.state.fillStyle.patternVersion = patternFillStore.version;
  context.state.fillStyle.mode = 'brush';
};

export const setAxis = (context: Context, axis: GradientAxis): void => {
  context.state.fillStyle.axis = axis;
};

export const setDither = (context: Context, dither: number): void => {
  context.state.fillStyle.dither = Math.max(0, Math.min(20, Math.round(dither)));
};

// Experimental: tunes the dither jitter half-width (dither * jitter% of a band,
// see gradientFill.ts). 17% (~1/6) matches PyDPainter's HORIZ_FIT dither
// exactly.
export const setJitter = (context: Context, jitter: number): void => {
  context.state.fillStyle.jitter = Math.max(0, Math.min(50, Math.round(jitter)));
};

export const openSettings = (context: Context): void => {
  const { mode, axis, dither, jitter, hasPattern, patternVersion } = context.state.fillStyle;
  context.state.fillStyle.settingsSnapshot = {
    mode,
    axis,
    dither,
    jitter,
    hasPattern,
    patternVersion,
  };
  patternFillStore.takeSnapshot();
  context.state.fillStyle.settingsOpen = true;
};

export const closeSettings = (context: Context): void => {
  context.state.fillStyle.settingsOpen = false;
  context.state.fillStyle.settingsSnapshot = null;
};

// Restore the values from when the panel was opened, then close: including
// undoing a capture made via "From Brush" during this session, the same as any
// other control here.
export const cancelSettings = (context: Context): void => {
  const snapshot = context.state.fillStyle.settingsSnapshot;
  if (snapshot) {
    context.state.fillStyle.mode = snapshot.mode;
    context.state.fillStyle.axis = snapshot.axis;
    context.state.fillStyle.dither = snapshot.dither;
    context.state.fillStyle.jitter = snapshot.jitter;
    context.state.fillStyle.hasPattern = snapshot.hasPattern;
    context.state.fillStyle.patternVersion = snapshot.patternVersion;
    patternFillStore.restoreSnapshot();
  }
  context.actions.fillStyle.closeSettings();
};
