import { loadUiScale } from '../../uiScale';

export type State = {
  pasteBufferImageObjectURL: string;
  // What the image load requester shows about the decoded image awaiting a
  // color-treatment choice (the pixels themselves wait outside Overmind, in
  // canvas/pendingImage.ts). null while no load is in progress.
  imageLoadInfo: { width: number; height: number; colorCount: number } | null;
  // Same, for the brush load requester (pixels wait in canvas/pendingBrush.ts).
  // colorCount only counts opaque pixels — a brush's transparent pixels never
  // compete for a palette slot.
  brushLoadInfo: { width: number; height: number; colorCount: number } | null;
  isLoading: boolean;
  menuOpen: boolean;
  // the Brush drawer (transforms + brush disk) inside the menu; remembered
  // across menu open/close so it reopens the way it was left
  brushDrawerOpen: boolean;
  // How much the app chrome is scaled down, for OS display scaling and small
  // screens — see uiScale.ts. Persisted in localStorage, not part of a
  // document, so it's read back here at startup.
  uiScale: number;
};

export const state: State = {
  pasteBufferImageObjectURL: '',
  imageLoadInfo: null,
  brushLoadInfo: null,
  isLoading: false,
  menuOpen: false,
  brushDrawerOpen: true,
  uiScale: loadUiScale(),
};
