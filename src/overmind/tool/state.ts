import { PaintColor, Point } from '../../types';

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
  airbrushTool: {
    position: Point | null;
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
  textTool: {
    text: string;
    start: Point | null;
  };
  brushSelectorTool: { start: Point | null };
  // anchor = the dragged brush's fixed top-left corner (null while not dragging)
  brushStretchTool: { anchor: Point | null };
  brushShearTool: { anchor: Point | null };
  // center = rotation pivot (null while not dragging); startAngle = the
  // pointer's angle at press; angle = live readout in whole degrees
  brushRotateTool: { center: Point | null; startAngle: number; angle: number };
  floodFillTool: { hoverColor: PaintColor | null };
  activePaintColor: PaintColor;
  // +1 while painting with the left button (FG), -1 with the right (BG) —
  // Shade's up/down direction rides the existing FG/BG stroke distinction
  shadeDirection: 1 | -1;
};

export const state: State = {
  freehandTool: { previous: null },
  lineTool: { start: null },
  curveTool: { start: null, end: null },
  airbrushTool: { position: null },
  rectangleTool: { start: null },
  circleTool: { origin: null },
  ellipseTool: {
    origin: null,
    radiusX: null,
    radiusY: null,
    angle: 0,
  },
  polygonTool: { vertices: [] },
  textTool: { text: '', start: null },
  brushSelectorTool: { start: null },
  brushStretchTool: { anchor: null },
  brushShearTool: { anchor: null },
  brushRotateTool: { center: null, startAngle: 0, angle: 0 },
  floodFillTool: { hoverColor: null },
  activePaintColor: { kind: 'index', colorNumber: 1 },
  shadeDirection: 1,
};
