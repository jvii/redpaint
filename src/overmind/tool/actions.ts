import { Context } from '../../overmind';
import { PaintColor, Point } from '../../types';
import { foregroundPaintColorOf, backgroundPaintColorOf } from '../palette/state';

export const activeToolToFGFillStyle = (context: Context): void => {
  // computed from raw fields: derived state is not readable inside actions
  context.state.tool.activePaintColor = foregroundPaintColorOf(context.state.palette);
  context.state.tool.shadeDirection = 1;
};

export const activeToolToBGFillStyle = (context: Context): void => {
  context.state.tool.activePaintColor = backgroundPaintColorOf(context.state.palette);
  context.state.tool.shadeDirection = -1;
};

// freehand

export const freeHandToolPrevious = (context: Context, point: Point | null): void => {
  context.state.tool.freehandTool.previous = point;
};

// line

export const lineToolStart = (context: Context, point: Point | null): void => {
  context.state.tool.lineTool.start = point;
};

// curve

export const curveToolStart = (context: Context, point: Point | null): void => {
  context.state.tool.curveTool.start = point;
};

export const curveToolEnd = (context: Context, point: Point | null): void => {
  context.state.tool.curveTool.end = point;
};

export const curveToolReset = (context: Context): void => {
  context.state.tool.curveTool.start = null;
  context.state.tool.curveTool.end = null;
};

// airbrush

export const airbrushToolPosition = (context: Context, point: Point | null): void => {
  context.state.tool.airbrushTool.position = point;
};

// rectangle

export const rectangleToolStart = (context: Context, point: Point | null): void => {
  context.state.tool.rectangleTool.start = point;
};

// circle

export const circleToolOrigin = (context: Context, point: Point | null): void => {
  context.state.tool.circleTool.origin = point;
};

// ellipse

export const ellipseToolOrigin = (context: Context, point: Point | null): void => {
  context.state.tool.ellipseTool.origin = point;
};

export const ellipseToolRadius = (
  context: Context,
  radius: { x: number | null; y: number | null }
): void => {
  context.state.tool.ellipseTool.radiusX = radius.x;
  context.state.tool.ellipseTool.radiusY = radius.y;
};

export const ellipseToolAngle = (context: Context, angle: number): void => {
  context.state.tool.ellipseTool.angle = angle;
};

export const ellipseToolReset = (context: Context): void => {
  context.state.tool.ellipseTool.origin = null;
  context.state.tool.ellipseTool.radiusX = null;
  context.state.tool.ellipseTool.radiusY = null;
  context.state.tool.ellipseTool.angle = 0;
};

// polygon

export const polygonToolAddVertice = (context: Context, point: Point): void => {
  context.state.tool.polygonTool.vertices.push(point);
};

export const polygonToolReset = (context: Context): void => {
  context.state.tool.polygonTool.vertices = [];
};

// text

export const textToolStart = (context: Context, point: Point): void => {
  context.state.tool.textTool.start = point;
};

export const textToolKey = (context: Context, key: string): void => {
  if (key.length === 1) {
    context.state.tool.textTool.text = context.state.tool.textTool.text + key;
  } else if (key === 'Backspace') {
    context.state.tool.textTool.text = context.state.tool.textTool.text.slice(0, -1);
  }
};

export const textToolReset = (context: Context): void => {
  context.state.tool.textTool.start = null;
  context.state.tool.textTool.text = '';
};

// flood fill

export const floodFillToolHoverColor = (context: Context, color: PaintColor | null): void => {
  context.state.tool.floodFillTool.hoverColor = color;
};

// brush selection

export const brushSelectionStart = (context: Context, point: Point | null): void => {
  context.state.tool.brushSelectorTool.start = point;
};

// brush stretch / shear

export const brushStretchStart = (context: Context, anchor: Point | null): void => {
  context.state.tool.brushStretchTool.anchor = anchor;
};

export const brushShearStart = (context: Context, anchor: Point | null): void => {
  context.state.tool.brushShearTool.anchor = anchor;
};

export const brushRotateStart = (
  context: Context,
  start: { center: Point; startAngle: number } | null
): void => {
  context.state.tool.brushRotateTool.center = start?.center ?? null;
  context.state.tool.brushRotateTool.startAngle = start?.startAngle ?? 0;
  context.state.tool.brushRotateTool.angle = 0;
};

export const brushRotateAngle = (context: Context, angle: number): void => {
  context.state.tool.brushRotateTool.angle = angle;
};
