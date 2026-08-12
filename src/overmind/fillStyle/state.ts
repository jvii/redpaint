import { derived } from 'overmind';
import { GradientAxis, GradientFillStyle } from '../../algorithm/gradientFill';
import { activeRangeIndices } from '../../algorithm/paletteRange';
import type { OvermindState } from '../../overmind';

export type FillMode = 'solid' | 'gradient' | 'brush';

// What a fill would *actually* paint right now, as opposed to `mode`, which is
// only what the requester has armed. The two differ whenever the armed mode
// can't be honoured: Pattern with nothing captured yet, or Gradient with an FG
// color that isn't in a usable range. DPaint has the same split. "If your
// current color is outside all ranges, DeluxePaint will not create a gradient
// fill but will fill with the solid color" (DP2 manual §2.19), and hangs real
// UI off it: the menubar's Color Fill Box appears only when this is not 'solid'
// (§4.25, "absent if fill mode is set to normal").
export type EffectiveFillMode = 'solid' | 'gradient' | 'pattern';

// Snapshot/restore shape for the settings panel's Cancel: every field a
// requester control can change. The pattern bitmap never enters this object, or
// Overmind state at all (see PatternFill.ts). Overmind deep-proxies anything
// assigned into state, which corrupts a CustomBrush's Uint8Array and makes
// texImage2D reject it. Only the boolean/number mirrors travel through here.
type Snapshot = {
  mode: FillMode;
  axis: GradientAxis;
  dither: number;
  jitter: number;
  hasPattern: boolean;
  patternVersion: number;
};

export type State = {
  mode: FillMode;
  axis: GradientAxis;
  dither: number; // 0..20, 0 = off (PyDPainter's Random dither scale)
  // How far dither can push a pixel, as a percentage of a band's own width (see
  // gradientFill.ts). Exposed rather than a constant so it can still be tuned
  // against DPaint.
  jitter: number;
  settingsOpen: boolean;
  settingsSnapshot: Snapshot | null;
  // Reactive mirror of patternFillStore (PatternFill.ts), whose bitmap stays
  // out of Overmind: the same split as brushRecall/state.brush. hasPattern
  // gates every "is Pattern usable" check; patternVersion exists so a
  // recapture, which does not flip an already-true hasPattern, still gives the
  // live preview's effect a changed dependency.
  hasPattern: boolean;
  patternVersion: number;
  // The effective gradient to paint with: null in solid mode, or in gradient
  // mode when the FG color is in no range (a solid fill then, as DPaint).
  // Which range is DPaint's rule rather than a picker: whichever range slot
  // contains the FG color (activeRangeIndices, the lookup Cycle/Shade/Blend
  // use), so changing the range means changing the FG color.
  readonly effectiveFillStyle: GradientFillStyle | null;
  // The one place deciding which of the three fill paths a fill takes. Read by
  // drawStyledFilledShape and by the menubar's Color Fill Box, so the swatch
  // cannot claim a gradient the fill would decline to paint.
  readonly effectiveMode: EffectiveFillMode;
};

export const state: State = {
  mode: 'solid',
  axis: 'vertical',
  dither: 5,
  jitter: 17, // ~1/6, matches PyDPainter's HORIZ_FIT dither (see gradientFill.ts)
  settingsOpen: false,
  settingsSnapshot: null,
  hasPattern: false,
  patternVersion: 0,
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
  effectiveMode: derived((state: State): EffectiveFillMode => {
    if (state.mode === 'brush') {
      return state.hasPattern ? 'pattern' : 'solid';
    }
    const style = state.effectiveFillStyle;
    // A one-color range is a gradient with a single band, i.e. a solid fill by
    // another name: treated as solid so the Color Fill Box doesn't show a flat
    // rectangle indistinguishable from no fill style at all.
    return style && style.rangeHigh > style.rangeLow ? 'gradient' : 'solid';
  }),
};
