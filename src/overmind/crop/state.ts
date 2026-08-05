// A rectangle in canvas coordinates: the region a crop would keep.
export type CropRect = { x: number; y: number; width: number; height: number };

export type State = {
  // The crop box being adjusted, or null when no crop is in progress. Armed
  // from the Picture drawer's Crop gadget, which closes the menu as it arms.
  //
  // Why this lives here and not in a Tool: every tool in src/tools is a
  // one-shot gesture — press, drag, release, done — with its scratch state in
  // the `tool` module for the length of that drag. BrushSelector even drags a
  // rectangle over the canvas much as this does, and commits on mouse-up.
  //
  // A crop box is not a gesture but an object. It outlives the drag that made
  // it, takes any number of adjustments after (move, eight-way resize, redraw
  // from scratch), and commits on a separate gesture entirely — right-click,
  // Enter or double-click — or cancels on Escape. The Tool interface has no
  // vocabulary for an interaction that persists past mouse-up and has its own
  // commit and cancel, and crop is invoked from a requester rather than picked
  // from the toolbar, so it wants none of the active-tool machinery either.
  //
  // (It is also modal — CropOverlay covers the canvas, so nothing paints
  // underneath — but that is a consequence, not the reason: a selected tool
  // already receives canvas events to the exclusion of the drawing tools.)
  rect: CropRect | null;
};

export const state: State = {
  rect: null,
};
