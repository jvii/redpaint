import { Point } from '../../types';

export type State = {
  resolution: { width: number; height: number };
  scrollFocusPoint: Point | null;
  zoomFocusPoint: Point | null;
  loadedImageURL: string;
};

export const state: State = {
  resolution: { width: 0, height: 0 },
  scrollFocusPoint: null,
  zoomFocusPoint: null,
  loadedImageURL: '',
};
