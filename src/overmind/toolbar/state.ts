import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';

export type State = {
  selectedTool: Tool;
  zoomModeOn: boolean;
};

export const state: State = {
  selectedTool: new FreehandTool(),
  zoomModeOn: false,
};
