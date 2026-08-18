import { MOD_KEY, SHIFT_MOD_KEY, isMac } from '../../platform';
import { GadgetHint } from './GadgetHint';

const FILL_STYLE = 'Fill Style settings';

// DPaint's Fill Type dialog, which every gadget that fills can reach, and it is
// Shift-F from all of them
const FILL_STYLE_KEYS = ['F'];

// Both halves of a shape gadget, with DPaint's pair of keys: the plain letter
// picks the unfilled shape and the shifted one the filled shape. Passed the
// letter rather than repeated four times, since the pattern is the point.
const shapeHalves = (letter: string): { gesture: string; does: string; keys: string[] }[] => [
  { gesture: 'top half', does: 'Unfilled', keys: [letter] },
  { gesture: 'bottom half', does: 'Filled', keys: [letter.toUpperCase()] },
];

export const toolboxHints: { [key: string]: GadgetHint } = {
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
    keys: ['v'],
    use: 'Drag from one end to the other.',
  },
  curve: {
    name: 'Curve',
    keys: ['q'],
    use: 'Drag to set the ends, then move to bend it and click.',
  },
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
  ellipse: {
    name: 'Ellipse',
    use: 'Drag out from the center to set the size, then move to reshape or drag to rotate.',
    parts: shapeHalves('e'),
    rightClick: FILL_STYLE,
    rightClickKeys: FILL_STYLE_KEYS,
  },
  polygon: {
    name: 'Polygon',
    use: 'Click each corner. Right-click on the canvas, or click the first corner, to close.',
    // Spelled out rather than shapeHalves(): there is no letter, see Airbrush.
    parts: [
      { gesture: 'top half', does: 'Unfilled' },
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
  text: {
    name: 'Text',
    use: 'Click where the text should start, then type. Return begins a new line, Escape finishes.',
    // Not shapeHalves(): the plain letter is the filled text here, the shifted
    // one the unfilled (see SHAPE_KEYS in GlobalHotkeyManager).
    parts: [
      { gesture: 'top half', does: 'Unfilled', keys: ['T'] },
      { gesture: 'bottom half', does: 'Filled', keys: ['t'] },
    ],
    // Either half: the font is the same font whichever way it is drawn.
    rightClick: 'Font',
  },
  zoom: {
    name: 'Magnify',
    keys: ['m'],
    use: 'Click, then click the canvas to choose what to magnify.',
  },
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
    use: 'Covers the canvas with the background color.',
    rightClick: 'Clear all and start over.',
  },
};

// The Color Indicator below the toolbox
export const colorIndicatorHint: GadgetHint = {
  name: 'Color Indicator',
  keys: [','],
  use: 'The circle is the current foreground color, the rectangle behind it the current background color.',
  parts: [
    { gesture: 'circle', does: 'Left-click to pick a foreground color off the canvas' },
    { gesture: 'rectangle', does: 'Left-click to pick a background color off the canvas' },
  ],
  rightClick: 'Palette editor',
  rightClickKeys: ['p'],
};
