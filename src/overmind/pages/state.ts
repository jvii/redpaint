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
  // When the set of pages last changed in a way the autosave has to write out:
  // a swap (the two trade storage roles), a copy, a delete. Not a merge, which
  // reads the other page and leaves it as it was.
  //
  // A swap changes the visible picture without recording an undo point, so this
  // is also what tells the document record it has gone stale — the undo
  // timestamps alone would leave a reload showing the page you swapped away
  // from.
  lastChangeTime: number;
};

export const state: State = {
  currentPageIndex: 0,
  pageCount: 1,
  lastChangeTime: 0,
};
