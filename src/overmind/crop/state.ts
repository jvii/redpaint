// A rectangle in canvas coordinates: the region a crop would keep.
export type CropRect = { x: number; y: number; width: number; height: number };

export type State = {
  // The crop box being adjusted, or null when no crop is in progress. Armed
  // from the Canvas Size requester, which closes as it arms.
  //
  // This is modal: while a box is up, CropOverlay covers the canvas, so
  // pointer events reach the box rather than the painting tools. That's why
  // crop isn't a Tool — it never uses the Tool mouse handlers, and the point
  // is precisely that painting can't happen underneath it.
  rect: CropRect | null;
};

export const state: State = {
  rect: null,
};
