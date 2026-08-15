export type State = {
  // Which page is on screen. Mirrors PageStore's own index, which lives outside
  // Overmind with the histories and rasters it owns (like brushRecall): this is
  // the reactive copy the status readout renders from.
  //
  // Stable across swaps, unlike DPaint's: it swapped the two bitmaps, so it
  // could not have said which page you were on. Keeping the array fixed and
  // moving the index is what lets the readout name one.
  currentPageIndex: number;
  // How many pages exist. One until the first swap creates the second, so
  // nothing about pages appears in the UI for anyone who never asks for them.
  pageCount: number;
};

export const state: State = {
  currentPageIndex: 0,
  pageCount: 1,
};
