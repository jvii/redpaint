import { Point } from '../../types';

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
  activeColorIndex: number;
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
  activeColorIndex: 0,
};
