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
import { DottedFreehandTool } from '../../tools/DottedFreehand';

const filled = true;
const noFill = false;

const drawingTools = {
  dottedFreehand: new DottedFreehandTool(),
  freeHand: new FreehandTool(),
  line: new LineTool(),
  curve: new CurveTool(),
  rectangleFilled: new RectangleTool(filled),
  rectangleNoFill: new RectangleTool(noFill),
  ellipseFilled: new EllipseTool(filled),
  ellipseNoFill: new EllipseTool(noFill),
  circleFilled: new CircleTool(filled),
  circleNoFill: new CircleTool(noFill),
  floodFill: new FloodFillTool(),
};

const selectorTools = {
  zoomInitialPointSelectorTool: new ZoomInitialPointSelectorTool(),
  brushSelectorTool: new BrushSelector(),
};

export type DrawingToolId = keyof typeof drawingTools;

export type State = {
  readonly activeTool: Tool;
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
  selectedDrawingToolId: 'freeHand',
  zoomModeState: 'off',
  brushSelectionModeOn: false,
  symmetryModeOn: false,
};
