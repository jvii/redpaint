import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { RectangleTool } from '../../tools/RectangleTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { BrushSelector } from '../../tools/BrushSelector';

const filled = true;
const noFill = false;

const drawingTools = {
  freeHand: new FreehandTool(),
  line: new LineTool(),
  rectangleFilled: new RectangleTool(filled),
  rectangleNoFill: new RectangleTool(noFill),
  floodFill: new FloodFillTool(),
};

const selectorTools = {
  zoomInitialPointSelectorTool: new ZoomInitialPointSelectorTool(),
  brushSelectorTool: new BrushSelector(),
};

export type DrawingToolId = keyof typeof drawingTools;

export type State = {
  selectedDrawingToolId: DrawingToolId;
  readonly selectedDrawingTool: Tool;
  readonly activeTool: Tool;
  zoomModeState: 'off' | 'on' | 'selectingInitialPoint';
  brushSelectionModeOn: boolean;
  selectedBuiltInBrush: number;
};

export const state: State = {
  selectedDrawingToolId: 'freeHand',
  get selectedDrawingTool(this: State): Tool {
    return drawingTools[this.selectedDrawingToolId];
  },
  get activeTool(this: State): Tool {
    if (this.zoomModeState === 'selectingInitialPoint') {
      return selectorTools['zoomInitialPointSelectorTool'];
    }
    if (this.brushSelectionModeOn) {
      return selectorTools['brushSelectorTool'];
    }
    return drawingTools[this.selectedDrawingToolId];
  },
  zoomModeState: 'off',
  brushSelectionModeOn: false,
  selectedBuiltInBrush: 1,
};
