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

const selectorTools = {
  zoomInitialPointSelectorTool: new ZoomInitialPointSelectorTool(),
  brushSelectorTool: new BrushSelector(),
};

export type DrawingToolId = keyof typeof drawingTools;
export type SelectorToolId = keyof typeof selectorTools;

export type State = {
  readonly activeTool: Tool;
  readonly previousTool: Tool | null;
  previousToolId: DrawingToolId | SelectorToolId | null;
  selectedDrawingToolId: DrawingToolId;
  zoomModeState: 'off' | 'on' | 'selectingInitialPoint';
  brushSelectionModeOn: boolean;
  symmetryModeOn: boolean;
};

export const state: State = {
  get activeTool(this: State): Tool {
    if (this.zoomModeState === 'selectingInitialPoint') {
      return selectorTools['zoomInitialPointSelectorTool'];
    }
    if (this.brushSelectionModeOn) {
      return selectorTools['brushSelectorTool'];
    }
    return drawingTools[this.selectedDrawingToolId];
  },
  get previousTool(this: State): Tool | null {
    if (!this.previousToolId) {
      return null;
    }
    if (
      this.previousToolId === 'zoomInitialPointSelectorTool' ||
      this.previousToolId === 'brushSelectorTool'
    ) {
      return selectorTools[this.previousToolId];
    }
    return drawingTools[this.previousToolId];
  },
  previousToolId: null,
  selectedDrawingToolId: 'freeHand',
  zoomModeState: 'off',
  brushSelectionModeOn: false,
  symmetryModeOn: false,
};
