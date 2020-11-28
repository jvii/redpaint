import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { RectangleTool } from '../../tools/RectangleTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { BrushSelector } from '../../tools/BrushSelector';
import { CircleTool } from '../../tools/CircleTool';
import { CurveTool } from '../../tools/CurveTool';
import { EllipseTool } from '../../tools/EllipseTool';
import { DottedFreehandTool } from '../../tools/DottedFreehandTool';
import { AirbrushTool } from '../../tools/AirbrushTool';
import { PolygonTool } from '../../tools/PolygonTool';
import { TextTool } from '../../tools/TextTool';
import { ColorSelectorTool } from '../../tools/ColorSelectorTool';

const filled = true;
const noFill = false;

const drawingTools = {
  dottedFreehand: new DottedFreehandTool(),
  freeHand: new FreehandTool(),
  line: new LineTool(),
  curve: new CurveTool(),
  airbrush: new AirbrushTool(),
  rectangleFilled: new RectangleTool(filled),
  rectangleNoFill: new RectangleTool(noFill),
  circleFilled: new CircleTool(filled),
  circleNoFill: new CircleTool(noFill),
  ellipseFilled: new EllipseTool(filled),
  ellipseNoFill: new EllipseTool(noFill),
  polygonFilled: new PolygonTool(filled),
  polygonNoFill: new PolygonTool(noFill),
  floodFill: new FloodFillTool(),
  textFilled: new TextTool(filled),
  textNoFill: new TextTool(noFill),
};

const foregroundColor = true;
const backgroundColor = false;

const selectorTools = {
  zoomInitialPointSelectorTool: new ZoomInitialPointSelectorTool(),
  brushSelectorTool: new BrushSelector(),
  foregroundColorSelectorTool: new ColorSelectorTool(foregroundColor),
  backgroundColorSelectorTool: new ColorSelectorTool(backgroundColor),
};

export type DrawingToolId = keyof typeof drawingTools;
export type SelectorToolId = keyof typeof selectorTools;

export type State = {
  selectedDrawingToolId: DrawingToolId;
  selectedSelectorToolId: SelectorToolId | null;
  readonly activeToolId: DrawingToolId | SelectorToolId;
  readonly activeTool: Tool;
  previousToolId: DrawingToolId | SelectorToolId | null;
  readonly previousTool: Tool | null;
  zoomModeOn: boolean;
  symmetryModeOn: boolean;
};

export const state: State = {
  selectedDrawingToolId: 'freeHand', // one DrawingTool MUST be selected
  selectedSelectorToolId: null, // one SelectorTool CAN be selected
  // current activeTool: primarily the selected SelectorTool, secondarily the selected DrawingTool
  get activeToolId(): DrawingToolId | SelectorToolId {
    return this.selectedSelectorToolId ? this.selectedSelectorToolId : this.selectedDrawingToolId;
  },
  get activeTool(): Tool {
    return this.selectedSelectorToolId
      ? selectorTools[this.selectedSelectorToolId]
      : drawingTools[this.selectedDrawingToolId];
  },
  previousToolId: null,
  get previousTool(): Tool | null {
    if (!this.previousToolId) {
      return null;
    }
    if (
      this.previousToolId === 'zoomInitialPointSelectorTool' ||
      this.previousToolId === 'brushSelectorTool' ||
      this.previousToolId === 'foregroundColorSelectorTool' ||
      this.previousToolId === 'backgroundColorSelectorTool'
    ) {
      return selectorTools[this.previousToolId];
    }
    return drawingTools[this.previousToolId];
  },
  zoomModeOn: false,
  symmetryModeOn: false,
};
