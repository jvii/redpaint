import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';

export class ToolbarState {
  public selectedTool: Tool;
  public zoomModeOn: boolean;

  public constructor() {
    this.selectedTool = new FreehandTool();
    this.zoomModeOn = false;
  }
}

export type Action = { type: 'setSelectedTool'; tool: Tool } | { type: 'zoomModeOn'; on: boolean };

export function toolbarStateReducer(state: ToolbarState, action: Action): ToolbarState {
  switch (action.type) {
    case 'setSelectedTool':
      return {
        ...state,
        selectedTool: action.tool,
      };
    case 'zoomModeOn':
      return {
        ...state,
        zoomModeOn: action.on,
      };
    default:
      return state;
  }
}

export default ToolbarState;
