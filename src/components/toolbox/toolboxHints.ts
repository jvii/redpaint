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
// them differently, so write canvas behavior here and nowhere else.
//
// **One short sentence.** These are read at a glance by someone who paused
// over a gadget, not studied — a second clause explaining the finer points
// costs more attention than it returns, and the panel grows tall enough to
// cover the picture. Where a tool genuinely has two steps (Curve, Ellipse,
// Polygon) say both plainly; everything else gets one. Detail that only
// matters once you are using the tool belongs in the docs, not here.
const FILL_STYLE = 'Fill Style settings';
const shapeHalves = [
  { gesture: 'top half', does: 'Outline' },
  { gesture: 'bottom half', does: 'Filled' },
];

export const toolboxHints: { [key: string]: GadgetHint } = {
  dottedFreehand: {
    name: 'Dotted Freehand',
    use: 'Drag to paint one brush stamp per pointer step.',
  },
  freehand: {
    name: 'Freehand',
    use: 'Drag to paint a continuous stroke.',
  },
  line: {
    name: 'Line',
    use: 'Drag from one end to the other.',
  },
  curve: {
    name: 'Curve',
    use: 'Drag to set the ends, then move to bend it and click.',
  },
  // Not "with the foreground color": paintPoints branches three ways, so what
  // lands is whatever the Fill Style says — a gradient or a pattern owes
  // nothing to the foreground. Which button was pressed only decides the color
  // in the solid case, and that rule is the Color Indicator's to state.
  floodFill: {
    name: 'Flood Fill',
    use: 'Click an area to flood it with the current Fill Style.',
    rightClick: FILL_STYLE,
  },
  airbrush: {
    name: 'Airbrush',
    use: 'Hold to keep spraying.',
  },
  rectangle: {
    name: 'Rectangle',
    use: 'Drag from one corner to the opposite one.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  circle: {
    name: 'Circle',
    use: 'Drag out from the center.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  // Two-stage, unlike Circle and Rectangle: the first release fixes the radii
  // and puts it into an adjust phase, where a plain move reshapes and a drag
  // sets the rotation angle (EllipseTool.onMouseMove).
  ellipse: {
    name: 'Ellipse',
    use: 'Drag out from the center to set the size, then move to reshape or drag to rotate.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  // "on the canvas" earns its words here: this is the one panel where
  // right-click means two different things, and the other one is a row below.
  polygon: {
    name: 'Polygon',
    use: 'Click each corner. Right-click on the canvas, or click the first corner, to close.',
    parts: shapeHalves,
    rightClick: FILL_STYLE,
  },
  brushSelect: {
    name: 'Brush Selector',
    use: 'Drag a box to pick that piece of the canvas up as the brush.',
  },
  // A stub: TextTool takes keystrokes into state, but every renderText call in
  // it is commented out, so nothing reaches the canvas (docs/TODO.md says the
  // same). The hint used to describe the tool it will be one day, which is the
  // worst thing a hint can do — someone who follows it and sees nothing
  // concludes they are holding it wrong. Its two halves are dropped for the
  // same reason: Outline and Filled are real toolbox states and neither draws.
  text: {
    name: 'Text',
    use: 'Unfinished: it takes keystrokes but draws nothing yet.',
  },
  // Aim first, then the view opens: the click arms zoomInitialPointSelectorTool
  // and the canvas click that follows is what chooses the point
  // (toolbox.toggleZoomMode).
  zoom: {
    name: 'Magnify',
    use: 'Click, then click the canvas to choose what to magnify.',
  },
  // A plain on/off toggle (toolbox.toggleSymmetryMode). The center defaults to
  // the canvas center (symmetry state: `center: null`), and the picker that
  // moves it is armed from the settings panel — not by clicking here, which
  // the hint used to claim.
  symmetry: {
    name: 'Symmetry',
    use: 'Mirrors and repeats every stroke around a center point.',
    rightClick: 'Symmetry settings',
  },
  undo: {
    name: 'Undo',
    keys: ['U', 'ctrl/cmd-Z'],
    use: 'Steps back one committed change at a time.',
    rightClick: 'Redo',
    rightClickKeys: ['ctrl/cmd-shift-Z'],
  },
  clr: {
    name: 'Clear',
    use: 'Covers the page with the background color.',
    rightClick: 'New page: fits the window, default palette',
  },
};

// The Color Indicator below the toolbox — DPaint's own name for it, and the
// manual's description too: an inner shape showing the current foreground and
// an outer one showing the current background (DP2 manual, "A Guided Tour").
// Not one of the three button components, so it wires the hint up itself
// (useGadgetHint).
//
// Deliberately silent about one thing. Right-click paints with the background
// color in all ten painting tools — nine through prepareToPaint, Flood Fill
// through its own onContextMenu — and this panel was briefly where that got
// said, on the grounds that the rule belongs to the background color rather
// than to any one tool. It is out again: true and useful is not the same as
// worth the room, and it made the one panel that should be a plain legend for
// two swatches into the place the app explains itself.
//
// So it is not missing from here by oversight, and it does not belong in the
// ten tool hints either — that would be the same sentence ten times, with the
// first copy to drift being the one nobody updates. It is documentation, and
// it lives outside the UI.
export const colorIndicatorHint: GadgetHint = {
  name: 'Color Indicator',
  use: 'The circle is the current foreground color, the rectangle behind it the current background color.',
  // Both arm a picker that samples the *canvas* — ColorSelectorTool reads the
  // pixel under the next click (getPaintColorForPoint). The palette is where
  // you choose a color you can already see; this is how you take one you can
  // only point at.
  parts: [
    { gesture: 'circle', does: 'Left-click to pick a foreground color off the canvas' },
    { gesture: 'rectangle', does: 'Left-click to pick a background color off the canvas' },
  ],
  rightClick: 'Palette editor',
};
