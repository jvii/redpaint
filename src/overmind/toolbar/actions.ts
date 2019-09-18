import { Action } from 'overmind';
import { Tool } from '../../tools/Tool';

export const setSelectedTool: Action<Tool> = ({ state }, tool) => {
  state.toolbar.selectedTool = tool;
};

export const toggleZoomMode: Action = ({ state }) => {
  state.toolbar.zoomModeOn = state.toolbar.zoomModeOn ? false : true;
};
