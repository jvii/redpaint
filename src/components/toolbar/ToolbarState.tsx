import { Tool } from '../../tools/Tool';
import { FreehandTool } from '../../tools/FreehandTool';

export class ToolbarState {
  public selectedTool: Tool;
  public constructor() {
    this.selectedTool = new FreehandTool();
  }
}

export type Action = { type: 'setSelectedTool'; tool: Tool };

export function toolbarStateReducer(state: ToolbarState, action: Action): ToolbarState {
  switch (action.type) {
    case 'setSelectedTool':
      return {
        ...state,
        selectedTool: action.tool,
      };
    default:
      return state;
  }
}

export default ToolbarState;
