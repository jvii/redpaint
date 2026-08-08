import { GadgetHint } from './GadgetHint';

// What each toolbox gadget says on hover. Kept together rather than inline in
// Toolbox.tsx so the wording can be read as a set — the same gesture should be
// named the same way everywhere, and that is only checkable side by side.
//
// Every gadget has one, including the plain tools whose icons are already
// clear. Partial coverage would be worse than none: hovering and getting
// nothing would mean either "no hint written" or "nothing hidden here", and a
// reader cannot tell which.
//
// `use` is a sentence about the picture — what happens when you drag on the
// canvas, or what an action gadget does. Everything below it in the panel is a
// gesture on the gadget itself. Keeping that split is what lets the panel show
// them differently, so write canvas behaviour here and nowhere else.
const FILL_STYLE = 'Fill Style settings';
const shapeHalves = [
  { gesture: 'top half', does: 'Outline' },
  { gesture: 'bottom half', does: 'Filled' },
];

export const toolboxHints: { [key: string]: GadgetHint } = {
  dottedFreehand: {
    name: 'Dotted Freehand',
    use: 'Drag to paint one brush stamp per pointer step, leaving gaps as you move faster.',
  },
  freehand: {
    name: 'Freehand',
    use: 'Drag to paint a continuous stroke.',
  },
  line: {
    name: 'Line',
    use: 'Drag from one end of the line to the other.',
  },
  curve: {
    name: 'Curve',
    use: 'Drag to set the two ends, then move to bend it and click to commit.',
  },
  floodFill: {
    name: 'Flood Fill',
    use: 'Click an area to flood it with the foreground color.',
    rightClick: FILL_STYLE,
  },
  airbrush: {
    name: 'Airbrush',
    use: 'Hold the button down to keep spraying; the longer you dwell, the denser it gets.',
  },
  rectangle: {
    name: 'Rectangle',
    use: 'Drag from one corner to the opposite one.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  circle: {
    name: 'Circle',
    use: 'Drag out from the centre.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  // Two-stage, unlike Circle and Rectangle: the first release fixes the radii
  // and puts it into an adjust phase, where a plain move reshapes and a drag
  // sets the rotation angle (EllipseTool.onMouseMove).
  ellipse: {
    name: 'Ellipse',
    use: 'Drag out from the centre and release to set the size. Then move to reshape it, or drag to rotate; the next release draws it.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  // "on the canvas" earns its words here: this is the one panel where
  // right-click means two different things, and the other one is a row below.
  polygon: {
    name: 'Polygon',
    use: 'Click each corner in turn. Right-click on the canvas, or click the first corner again, to close the shape.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  brushSelect: {
    name: 'Brush Selector',
    use: 'Drag a box on the canvas to pick that piece up as the brush.',
  },
  text: {
    name: 'Text',
    use: 'Click where the text should start, then type.',
    parts: shapeHalves,
  },
  zoom: {
    name: 'Magnify',
    use: 'Opens the zoom view beside the canvas; click the canvas to aim it.',
  },
  symmetry: {
    name: 'Symmetry',
    use: 'Mirrors every stroke about a centre point; click the canvas to place it.',
    rightClick: 'Symmetry settings',
  },
  undo: {
    name: 'Undo',
    keys: ['U', 'ctrl/cmd-Z'],
    use: 'Steps back through the picture, one committed change at a time.',
    rightClick: 'Redo',
    rightClickKeys: ['ctrl/cmd-shift-Z'],
  },
  clr: {
    name: 'Clear',
    use: 'Covers the page with the background color, leaving its size and palette alone.',
    rightClick: 'New page: fits the window, default palette',
  },
};

// The Color Indicator below the toolbox — DPaint's own name for it, and the
// manual's description too: an inner shape showing the current foreground and
// an outer one showing the current background (DP2 manual, "A Guided Tour").
// Not one of the three button components, so it wires the hint up itself
// (useGadgetHint).
//
// It is also where the app's one universal painting convention is written
// down, and the only place: right-click paints with the background color, in
// every one of the ten painting tools — nine through prepareToPaint, Flood
// Fill through its own onContextMenu. Repeating that in ten panels would be
// the same sentence ten times, and the first copy to drift would be the one
// nobody thought to update. It belongs to the background color rather than to
// any tool, so it lives with the swatch that shows it.
export const colorIndicatorHint: GadgetHint = {
  name: 'Color Indicator',
  use: 'The circle is the current foreground color, the rectangle behind it the current background color. Right-click with any painting tool to draw with the background instead.',
  // Both arm a picker that samples the *canvas* — ColorSelectorTool reads the
  // pixel under the next click (getPaintColorForPoint). The palette is where
  // you choose a color you can already see; this is how you take one you can
  // only point at.
  parts: [
    { gesture: 'circle', does: 'Pick a foreground color off the canvas' },
    { gesture: 'rectangle', does: 'Pick a background color off the canvas' },
  ],
  rightClick: 'Palette editor',
};
