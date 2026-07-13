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
};

export const state: State = {
  pasteBufferImageObjectURL: '',
  imageLoadInfo: null,
  brushLoadInfo: null,
  isLoading: false,
  menuOpen: false,
};
