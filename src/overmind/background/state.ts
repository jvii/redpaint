// The reactive mirror of canvas/Background, which holds the frozen picture
// itself (docs/stencil.md). Only what the UI renders lives here.
export type State = {
  fixed: boolean;
};

export const state: State = {
  fixed: false,
};
