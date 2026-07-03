import { derived } from 'overmind';
import { Point } from '../../types';
import { SymmetrySettings } from '../../algorithm/symmetry';
import type { OvermindState } from '../../overmind';

export type State = {
  center: Point | null; // null => default to canvas center
  order: number; // number of rotational copies, 1..40
  mirror: boolean;
  // The effective settings for drawing: null when symmetry mode is off or the
  // canvas is not yet sized. Center falls back to the canvas center.
  readonly activeSettings: SymmetrySettings | null;
};

// Defaults match DPaint's DPINIT.C: SymSet(6, YES, center) => order 6, mirror on.
export const state: State = {
  center: null,
  order: 6,
  mirror: true,
  activeSettings: derived((state: State, rootState: OvermindState): SymmetrySettings | null => {
    if (!rootState.toolbox.symmetryModeOn) {
      return null;
    }
    const { resolution } = rootState.canvas;
    if (resolution.width === 0 || resolution.height === 0) {
      return null;
    }
    const center = state.center ?? {
      x: Math.floor(resolution.width / 2),
      y: Math.floor(resolution.height / 2),
    };
    return { center, order: state.order, mirror: state.mirror };
  }),
};
