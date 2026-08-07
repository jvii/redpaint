import { GadgetHint } from './GadgetHint';

// What each toolbox gadget says on hover. Kept together rather than inline in
// Toolbox.tsx so the wording can be read as a set — the gestures should be
// named the same way everywhere, and that is only checkable side by side.
//
// Every gadget has one, including the plain tools whose icons are already
// clear. Partial coverage would be worse than none: hovering and getting
// nothing would mean either "no hint written" or "nothing hidden here", and a
// reader cannot tell which.
//
// Rows are for gestures that are not the obvious one. A plain click selecting
// the tool needs no line; a right-click that opens a requester does, and the
// dual gadgets need one per half because the icon's two triangles do not say
// which is which.
const fillStyleRow = { gesture: 'right-click', does: 'Fill Style settings' };
const shapeRows = [
  { gesture: 'top half', does: 'Outline' },
  { gesture: 'bottom half', does: 'Filled' },
  fillStyleRow,
];

export const toolboxHints: { [key: string]: GadgetHint } = {
  dottedFreehand: {
    name: 'Dotted Freehand',
    rows: [{ gesture: 'drag', does: 'Paints one stamp per pointer step' }],
  },
  freehand: { name: 'Freehand', rows: [{ gesture: 'drag', does: 'Paints a continuous stroke' }] },
  line: { name: 'Line', rows: [{ gesture: 'drag', does: 'From press to release' }] },
  curve: {
    name: 'Curve',
    rows: [
      { gesture: 'drag', does: 'Sets the ends' },
      { gesture: 'then move', does: 'Bends it; click to commit' },
    ],
  },
  floodFill: { name: 'Flood Fill', rows: [fillStyleRow] },
  airbrush: { name: 'Airbrush', rows: [{ gesture: 'hold', does: 'Keeps spraying while held' }] },
  rectangle: { name: 'Rectangle', rows: shapeRows },
  circle: { name: 'Circle', rows: shapeRows },
  ellipse: { name: 'Ellipse', rows: shapeRows },
  polygon: {
    name: 'Polygon',
    rows: [
      { gesture: 'top half', does: 'Outline' },
      { gesture: 'bottom half', does: 'Filled' },
      { gesture: 'click', does: 'Adds a corner; click the first to close' },
      fillStyleRow,
    ],
  },
  brushSelect: {
    name: 'Brush Selector',
    rows: [{ gesture: 'drag a box', does: 'Picks up that piece of the canvas as the brush' }],
  },
  text: {
    name: 'Text',
    rows: [
      { gesture: 'top half', does: 'Outline' },
      { gesture: 'bottom half', does: 'Filled' },
    ],
  },
  zoom: { name: 'Magnify', rows: [{ gesture: 'click', does: 'Opens the zoom view; click to aim' }] },
  symmetry: {
    name: 'Symmetry',
    rows: [
      { gesture: 'click', does: 'Arms it; click the canvas to set the centre' },
      { gesture: 'right-click', does: 'Symmetry settings' },
    ],
  },
  undo: {
    name: 'Undo',
    key: 'U',
    // One row per gesture, each saying what that gesture does. The head names
    // the gadget; repeating "Undo" as the answer to "what does ctrl-z do" is
    // not redundancy, where a row reading "ctrl/cmd-z → Undo" under a heading
    // already reading Undo would be.
    rows: [
      { gesture: 'ctrl/cmd-z', does: 'Undo' },
      { gesture: 'right-click', does: 'Redo' },
      { gesture: 'ctrl/cmd-shift-z', does: 'Redo' },
    ],
  },
  clr: {
    name: 'Clear',
    rows: [
      { gesture: 'click', does: 'Covers the page with the background colour' },
      { gesture: 'right-click', does: 'New page: fits the window, default palette' },
    ],
  },
};
