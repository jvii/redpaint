import { PaintColor, Point } from '../../types';

// DPaint's INITABRADIUS. A screen distance, so the spray is the same size
// whatever pixel shape the format has (docs/pixel-aspect.md).
export const DEFAULT_SPRAY_RADIUS = 30;

export type State = {
  freehandTool: {
    previous: Point | null;
  };
  lineTool: {
    start: Point | null;
  };
  curveTool: {
    start: Point | null;
    end: Point | null;
  };
  // radius = how far the spray reaches, as a distance on screen. Unlike every
  // other field here it outlives the stroke: it is a setting, sized by
  // right-clicking the gadget (SizeAirbrushTool), and there is no other
  // airbrush state for it to live beside.
  airbrushTool: {
    position: Point | null;
    radius: number;
  };
  rectangleTool: {
    start: Point | null;
  };
  circleTool: {
    origin: Point | null;
  };
  ellipseTool: {
    origin: Point | null;
    radiusX: number | null;
    radiusY: number | null;
    angle: number;
  };
  polygonTool: {
    vertices: Point[];
  };
  // start = where the current line's text begins (null while nothing is being
  // typed); lineStart = where Return returns to, which is the x of the click
  // that began the paragraph and does not move as lines wrap
  textTool: {
    text: string;
    start: Point | null;
    lineStart: Point | null;
  };
  brushSelectorTool: { start: Point | null };
  // anchor = the dragged brush's fixed top-left corner (null while not dragging)
  brushStretchTool: { anchor: Point | null };
  // same drag shape as brushStretchTool, but for right-click-resizing a
  // built-in brush (SizeBuiltInBrushTool) rather than stretching a custom one.
  // size = the live readout, in pixels the brush will actually come out as
  sizeBuiltInBrushTool: { anchor: Point | null; size: { width: number; height: number } | null };
  // the same drag again, sizing the airbrush's spray rather than a brush
  sizeAirbrushTool: { anchor: Point | null; size: { width: number; height: number } | null };
  brushShearTool: { anchor: Point | null };
  // center = rotation pivot (null while not dragging); startAngle = the
  // pointer's angle at press; angle = live readout in whole degrees
  brushRotateTool: { center: Point | null; startAngle: number; angle: number };
  // shared by the horizontal and vertical bend tools (never active together);
  // origin = the press point, which held the bending edge's middle
  brushBendTool: { origin: Point | null };
  floodFillTool: { hoverColor: PaintColor | null };
  activePaintColor: PaintColor;
  // +1 while painting with the left button (FG), -1 with the right (BG):
  // Shade's up/down direction rides the existing FG/BG stroke distinction
  shadeDirection: 1 | -1;
};

export const state: State = {
  freehandTool: { previous: null },
  lineTool: { start: null },
  curveTool: { start: null, end: null },
  airbrushTool: { position: null, radius: DEFAULT_SPRAY_RADIUS },
  rectangleTool: { start: null },
  circleTool: { origin: null },
  ellipseTool: {
    origin: null,
    radiusX: null,
    radiusY: null,
    angle: 0,
  },
  polygonTool: { vertices: [] },
  textTool: { text: '', start: null, lineStart: null },
  brushSelectorTool: { start: null },
  brushStretchTool: { anchor: null },
  sizeBuiltInBrushTool: { anchor: null, size: null },
  sizeAirbrushTool: { anchor: null, size: null },
  brushShearTool: { anchor: null },
  brushRotateTool: { center: null, startAngle: 0, angle: 0 },
  brushBendTool: { origin: null },
  floodFillTool: { hoverColor: null },
  activePaintColor: { kind: 'index', colorNumber: 1 },
  shadeDirection: 1,
};
