import { Point } from '../../types';
import { Derive } from 'overmind';
import { colorToRGBString } from '../../tools/util/util';

export type State = {
  resolution: { width: number; height: number };
  scrollFocusPoint: Point | null;
  zoomFocusPoint: Point | null;
  mainCanvas: {
    lastModified: number;
    lastModifiedOverlay: number;
  };
  zoomCanvas: {
    lastModified: number;
    lastModifiedOverlay: number;
  };
  fillStyle: Derive<State, string>;
};

export const state: State = {
  resolution: { width: 0, height: 0 },
  scrollFocusPoint: null,
  zoomFocusPoint: null,
  mainCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  zoomCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  fillStyle: (state, rootState): string => {
    if (rootState.tool.activeToolFillStyle) {
      return rootState.tool.activeToolFillStyle.effective;
    }
    return colorToRGBString(rootState.palette.foregroundColor);
  },
};
