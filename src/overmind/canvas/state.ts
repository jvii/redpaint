import { Point } from '../../types';
import { derived, RootState } from 'overmind';
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
  loadedImageURL: string;
  fillStyle: string;
};

export const state: State = {
  resolution: { width: 0, height: 0 },
  scrollFocusPoint: null,
  zoomFocusPoint: null,
  mainCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  zoomCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  loadedImageURL: '',
  fillStyle: derived((state, rootState: RootState) => {
    if (rootState.tool.activeToolFillStyle) {
      return rootState.tool.activeToolFillStyle.effective;
    }
    return colorToRGBString(rootState.palette.foregroundColor);
  }),
};
