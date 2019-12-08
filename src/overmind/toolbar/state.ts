import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';
import { LineTool } from '../../tools/LineTool';
import { RectangleTool } from '../../tools/RectangleTool';
import { FloodFillTool } from '../../tools/FloodFillTool';
import { ZoomInitialPointSelectorTool } from '../../tools/ZoomInitialPointSelectorTool';
import { BrushSelector } from '../../tools/BrushSelector';

const filled = true;
const noFill = false;

export type State = {
  readonly selectedTool: Tool;
  selectedToolId: string;
  readonly activeTool: Tool;
  tools: { [id: string]: Tool };
  selectionInProcess: boolean;
  zoomModeOn: boolean;
  brushSelectionOn: boolean;
  selectedBuiltInBrush: number;
};

export const state: State = {
  selectedToolId: 'freeHandTool',
  get selectedTool(this: State): Tool {
    return this.tools[this.selectedToolId];
  },
  get activeTool(this: State): Tool {
    if (!this.selectionInProcess) {
      return this.tools[this.selectedToolId];
    }
    if (this.brushSelectionOn) {
      return this.tools['brushSelectorTool'];
    }
    if (this.zoomModeOn) {
      return this.tools['zoomInitialPointSelectorTool'];
    }
    return this.tools[this.selectedToolId];
  },
  tools: {
    freeHandTool: new FreehandTool(),
    lineTool: new LineTool(),
    rectangleFilledTool: new RectangleTool(filled),
    rectangleNoFillTool: new RectangleTool(noFill),
    floodFillTool: new FloodFillTool(),
    zoomInitialPointSelectorTool: new ZoomInitialPointSelectorTool(),
    brushSelectorTool: new BrushSelector(),
  },
  selectionInProcess: false,
  zoomModeOn: false,
  brushSelectionOn: false,
  selectedBuiltInBrush: 1,
};
