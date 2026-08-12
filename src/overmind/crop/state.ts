// A rectangle in canvas coordinates: the region a crop would keep.
export type CropRect = { x: number; y: number; width: number; height: number };

export type State = {
  // The crop box being adjusted, or null when no crop is in progress. Armed
  // from the Picture drawer's Crop gadget.
  //
  // Here rather than in a Tool because a crop box is an object, not a gesture:
  // it outlives the drag that made it, takes any number of adjustments after,
  // and commits or cancels on a separate gesture entirely. The Tool interface
  // has no vocabulary for that.
  rect: CropRect | null;
};

export const state: State = {
  rect: null,
};
