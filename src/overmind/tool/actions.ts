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

// Begins a paragraph: the clicked point is both where this line starts and
// where every later line returns to.
export const textToolStart = (context: Context, point: Point): void => {
  context.state.tool.textTool.start = point;
  context.state.tool.textTool.lineStart = point;
  context.state.tool.textTool.text = '';
};

export const textToolAppend = (context: Context, characters: string): void => {
  context.state.tool.textTool.text = context.state.tool.textTool.text + characters;
};

export const textToolBackspace = (context: Context): void => {
  context.state.tool.textTool.text = context.state.tool.textTool.text.slice(0, -1);
};

// Starts a new line under the current one, aligned with the paragraph's left
// edge rather than with wherever the previous line happened to end. Used by
// both Return and the wrap at the right edge; the committing of the finished
// line is the tool's business, not the state's.
export const textToolNewLine = (context: Context, lineHeight: number): void => {
  const lineStart = context.state.tool.textTool.lineStart;
  if (!lineStart) {
    return;
  }
  const y = (context.state.tool.textTool.start?.y ?? lineStart.y) + lineHeight;
  context.state.tool.textTool.start = { x: lineStart.x, y };
  context.state.tool.textTool.text = '';
};

// A line has just been stamped onto the picture. The caret carries on from the
// end of it rather than being put away: committing is what happens whenever the
// settings change under a line being typed — switching the gadget's half,
// opening the font requester — and in those cases the typing is not finished,
// only the part of it that was in the old font. Keeps lineStart, so Return
// still goes back to the paragraph's own left edge.
export const textToolCommitted = (context: Context, advance: number): void => {
  const start = context.state.tool.textTool.start;
  if (start) {
    context.state.tool.textTool.start = { x: start.x + advance, y: start.y };
  }
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

export const sizeBuiltInBrushStart = (context: Context, anchor: Point | null): void => {
  context.state.tool.sizeBuiltInBrushTool.anchor = anchor;
};

export const sizeBuiltInBrushSize = (
  context: Context,
  size: { width: number; height: number } | null
): void => {
  context.state.tool.sizeBuiltInBrushTool.size = size;
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

export const brushBendStart = (context: Context, origin: Point | null): void => {
  context.state.tool.brushBendTool.origin = origin;
};
