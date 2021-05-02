import { Action } from 'overmind';
import { Point } from '../../types';

export const activeToolToFGFillStyle: Action = ({ state }): void => {
  state.tool.activeColorIndex = Number(state.palette.foregroundColorId);
};

export const activeToolToBGFillStyle: Action = ({ state }): void => {
  state.tool.activeColorIndex = Number(state.palette.backgroundColorId);
};

// freehand

export const freeHandToolPrevious: Action<Point | null> = ({ state }, point): void => {
  state.tool.freehandTool.previous = point;
};

// line

export const lineToolStart: Action<Point | null> = ({ state }, point): void => {
  state.tool.lineTool.start = point;
};

// curve

export const curveToolStart: Action<Point | null> = ({ state }, point): void => {
  state.tool.curveTool.start = point;
};

export const curveToolEnd: Action<Point | null> = ({ state }, point): void => {
  state.tool.curveTool.end = point;
};

export const curveToolReset: Action = ({ state }): void => {
  state.tool.curveTool.start = null;
  state.tool.curveTool.end = null;
};

// airbrush

export const airbrushToolPosition: Action<Point | null> = ({ state }, point): void => {
  state.tool.airbrushTool.position = point;
};

// rectangle

export const rectangleToolStart: Action<Point | null> = ({ state }, point): void => {
  state.tool.rectangleTool.start = point;
};

// circle

export const circleToolOrigin: Action<Point | null> = ({ state }, point): void => {
  state.tool.circleTool.origin = point;
};

// ellipse

export const ellipseToolOrigin: Action<Point | null> = ({ state }, point): void => {
  state.tool.ellipseTool.origin = point;
};

export const ellipseToolRadius: Action<{ x: number | null; y: number | null }> = (
  { state },
  radius
): void => {
  state.tool.ellipseTool.radiusX = radius.x;
  state.tool.ellipseTool.radiusY = radius.y;
};

export const ellipseToolAngle: Action<number> = ({ state }, angle): void => {
  state.tool.ellipseTool.angle = angle;
};

export const ellipseToolReset: Action = ({ state }): void => {
  state.tool.ellipseTool.origin = null;
  state.tool.ellipseTool.radiusX = null;
  state.tool.ellipseTool.radiusY = null;
  state.tool.ellipseTool.angle = 0;
};

// polygon

export const polygonToolAddVertice: Action<Point> = ({ state }, point): void => {
  state.tool.polygonTool.vertices.push(point);
};

export const polygonToolReset: Action = ({ state }): void => {
  state.tool.polygonTool.vertices = [];
};

// text

export const textToolStart: Action<Point> = ({ state }, point): void => {
  state.tool.textTool.start = point;
};

export const textToolKey: Action<string> = ({ state }, key): void => {
  if (key.length === 1) {
    state.tool.textTool.text = state.tool.textTool.text + key;
  } else if (key === 'Backspace') {
    state.tool.textTool.text = state.tool.textTool.text.slice(0, -1);
  }
};

export const textToolReset: Action = ({ state }): void => {
  state.tool.textTool.start = null;
  state.tool.textTool.text = '';
};

// brush selection

export const brushSelectionStart: Action<Point | null> = ({ state }, point): void => {
  state.tool.brushSelectorTool.start = point;
};
