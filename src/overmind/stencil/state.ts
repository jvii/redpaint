// The reactive mirror of canvas/Stencil, which holds the raster itself
// (docs/stencil.md). Only what the UI renders lives here.
export type State = {
  // a stencil has been made and not freed
  exists: boolean;
  // made and not suspended: what the `S` indicator and the shader follow
  enabled: boolean;
  // Which palette colors the requester has ticked, by 1-based color number.
  // The draft while the requester is open; Make freezes it into the raster.
  lockedColors: boolean[];
  requesterOpen: boolean;
  // the ticks as they were when the requester opened, restored on Cancel
  lockedColorsSnapshot: boolean[] | null;
};

export const state: State = {
  exists: false,
  enabled: false,
  lockedColors: [],
  requesterOpen: false,
  lockedColorsSnapshot: null,
};
