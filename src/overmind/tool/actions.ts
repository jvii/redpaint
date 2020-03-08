import { Action } from 'overmind';
import { Point } from '../../types';
import { colorToRGBString } from '../../tools/util';

export const activeToolToFGFillStyle: Action = ({ state }): void => {
  const fillStyle = state.tool.activeToolFillStyle;
  if (!fillStyle) {
    return;
  }
  fillStyle.effective = colorToRGBString(state.palette.foregroundColor);
};

export const activeToolToBGFillStyle: Action = ({ state }): void => {
  const fillStyle = state.tool.activeToolFillStyle;
  if (!fillStyle) {
    return;
  }
  console.log('setting effective fillStyle');
  fillStyle.effective = colorToRGBString(state.palette.backgroundColor);
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

// brush selection

export const brushSelectionStart: Action<Point | null> = ({ state }, point): void => {
  state.tool.brushSelectorTool.start = point;
};
