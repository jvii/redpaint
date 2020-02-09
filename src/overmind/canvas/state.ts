import { Point } from '../../types';

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
  invertedCanvas: CanvasPattern | null;
};

export const state: State = {
  resolution: { width: 0, height: 0 },
  scrollFocusPoint: null,
  zoomFocusPoint: null,
  mainCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  zoomCanvas: { lastModified: 0, lastModifiedOverlay: 0 },
  invertedCanvas: null,
};
