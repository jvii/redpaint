import { MOD_KEY, SHIFT_MOD_KEY, isMac } from '../../platform';
import { GadgetHint } from './GadgetHint';

// What each toolbox gadget says on hover. Together rather than inline in
// Toolbox.tsx so the wording can be read as a set: the same gesture should be
// named the same way everywhere, which is only checkable side by side.
//
// Every gadget has one, including the tools whose icons are already clear —
// hovering and getting nothing cannot be told from no hint being written.
//
// `use` is a sentence about the picture; everything below it in the panel is a
// gesture on the gadget itself. That split is what lets the panel show them
// differently, so write canvas behavior here and nowhere else.
//
// **One short sentence**, read at a glance. Where a tool genuinely has two
// steps (Curve, Ellipse, Polygon) say both plainly; anything that only matters
// once you are using the tool belongs in the docs.
const FILL_STYLE = 'Fill Style settings';

// DPaint's Fill Type dialog, which every gadget that fills can reach — and it
// is Shift-F from all of them, not one key per gadget.
const FILL_STYLE_KEYS = ['F'];

// Both halves of a shape gadget, with DPaint's pair of keys: the plain letter
// picks the outline and the shifted one the filled shape. Passed the letter
// rather than repeated four times, since the pattern is the point.
const shapeHalves = (letter: string): { gesture: string; does: string; keys: string[] }[] => [
  { gesture: 'top half', does: 'Outline', keys: [letter] },
  { gesture: 'bottom half', does: 'Filled', keys: [letter.toUpperCase()] },
];

export const toolboxHints: { [key: string]: GadgetHint } = {
  // 's' for sketch and 'd' for draw, DPaint's own mnemonics — which read as
  // swapped, since 'd' is the one on the *continuous* tool. They are not.
  dottedFreehand: {
    name: 'Dotted Freehand',
    keys: ['s'],
    use: 'Drag to paint one brush stamp per pointer step.',
  },
  freehand: {
    name: 'Freehand',
    keys: ['d'],
    use: 'Drag to paint a continuous stroke.',
  },
  line: {
    name: 'Line',
    keys: ['v'], // vector
    use: 'Drag from one end to the other.',
  },
  curve: {
    name: 'Curve',
    keys: ['q'], // qurve, and the manual says so in as many words
    use: 'Drag to set the ends, then move to bend it and click.',
  },
  // Not "with the foreground color": paintPoints branches three ways, so what
  // lands is whatever the Fill Style says — a gradient or a pattern owes
  // nothing to the foreground. Which button was pressed only decides the color
  // in the solid case, and that rule is the Color Indicator's to state.
  floodFill: {
    name: 'Flood Fill',
    keys: ['f'],
    use: 'Click an area to flood it with the current Fill Style.',
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  // No key: DPaint gave Airbrush and Polygon none, and the letters left over
  // are ones it spent elsewhere.
  airbrush: {
    name: 'Airbrush',
    use: 'Hold to keep spraying.',
  },
  rectangle: {
    name: 'Rectangle',
    use: 'Drag from one corner to the opposite one.',
    parts: shapeHalves('r'),
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  circle: {
    name: 'Circle',
    use: 'Drag out from the center.',
    parts: shapeHalves('c'),
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  // Two-stage, unlike Circle and Rectangle: the first release fixes the radii
  // and puts it into an adjust phase, where a plain move reshapes and a drag
  // sets the rotation angle (EllipseTool.onMouseMove).
  ellipse: {
    name: 'Ellipse',
    use: 'Drag out from the center to set the size, then move to reshape or drag to rotate.',
    parts: shapeHalves('e'),
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  // "on the canvas" earns its words here: this is the one panel where
  // right-click means two different things, and the other one is a row below.
  polygon: {
    name: 'Polygon',
    use: 'Click each corner. Right-click on the canvas, or click the first corner, to close.',
    // Spelled out rather than shapeHalves(): there is no letter, see Airbrush.
    parts: [
      { gesture: 'top half', does: 'Outline' },
      { gesture: 'bottom half', does: 'Filled' },
    ],
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  brushSelect: {
    name: 'Brush Selector',
    keys: ['b'],
    use: 'Drag a box to pick that piece of the canvas up as the brush.',
  },
  // A stub: TextTool takes keystrokes into state, but every renderText call is
  // commented out, so nothing reaches the canvas. The hint says so rather than
  // describing the tool it will be one day — and its two halves are dropped for
  // the same reason: Outline and Filled are real states and neither draws.
  text: {
    name: 'Text',
    keys: ['t'],
    use: 'Unfinished: it takes keystrokes but draws nothing yet.',
  },
  // Aim first, then the view opens: the click arms zoomInitialPointSelectorTool
  // and the canvas click that follows is what chooses the point
  // (toolbox.toggleZoomMode).
  zoom: {
    name: 'Magnify',
    keys: ['m'],
    use: 'Click, then click the canvas to choose what to magnify.',
  },
  // A plain on/off toggle (toolbox.toggleSymmetryMode). The center defaults to
  // the canvas center (symmetry state: `center: null`), and the picker that
  // moves it is armed from the settings panel — not by clicking here, which
  // the hint used to claim.
  symmetry: {
    name: 'Symmetry',
    keys: ['/'],
    use: 'Mirrors and repeats every stroke around a center point.',
    rightClick: 'Symmetry settings',
  },
  // One idiom per platform, not the union: every chord works everywhere, but a
  // Mac user has no use for Ctrl-Y nor a Windows user for the Command key. 'u'
  // is DPaint's own and belongs to neither.
  undo: {
    name: 'Undo',
    keys: ['u', `${MOD_KEY}Z`],
    use: 'Steps back one committed change at a time.',
    rightClick: 'Redo',
    rightClickKeys: [isMac ? `${SHIFT_MOD_KEY}Z` : 'Ctrl+Y'],
  },
  clr: {
    name: 'Clear',
    keys: ['K'],
    // No key for the right-click: a new page is this app's, not DPaint's,
    // which had no New at all (its File menu begins at Load Picture).
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
// Deliberately silent about right-click painting with the background color,
// which every painting tool does. Saying it here turns a plain legend for two
// swatches into the place the app explains itself, and saying it in the ten
// tool hints is the same sentence ten times. It is documentation.
export const colorIndicatorHint: GadgetHint = {
  name: 'Color Indicator',
  // DPaint's "Select Color cursor", which arms the foreground picker — the
  // circle's own click. The background half it reaches only by mouse.
  keys: [','],
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
  rightClickKeys: ['p'],
};
