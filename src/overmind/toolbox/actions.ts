import { Context } from '../../overmind';
import { DrawingToolId } from './state';
import { brushHistory } from '../../brush/BrushHistory';
import { CustomBrush } from '../../brush/CustomBrush';
import { isBuiltInBrush } from '../brush/state';

export const setSelectedDrawingTool = (context: Context, toolId: DrawingToolId): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  context.state.toolbox.selectedDrawingToolId = toolId;
  context.state.toolbox.selectedSelectorToolId = null;
};

export const toggleZoomMode = (context: Context): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  context.actions.canvas.setZoomFocusPoint(null);
  // ZoomMode on => ZoomMode off
  if (context.state.toolbox.zoomModeOn) {
    context.state.toolbox.zoomModeOn = false;
    return;
  }
  // ZoomMode not yet on and selecting zoom initial point => exit initial point selection
  if (context.state.toolbox.selectedSelectorToolId === 'zoomInitialPointSelectorTool') {
    context.state.toolbox.selectedSelectorToolId = null;
    return;
  }
  // ZoomMode not on and not selecting zoom initial point => start initial point selection
  context.state.toolbox.selectedSelectorToolId = 'zoomInitialPointSelectorTool';
};

export const toggleBrushSelectionMode = (context: Context): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'brushSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'brushSelectorTool';
};

// The interactive brush transforms (docs/brush-transforms.md): modal drags
// on the canvas, so they ride the selector-tool slot like brush selection
// does. Custom brushes only, like every transform. Toggling one while the
// other is armed switches directly.
export const toggleBrushTransformMode = (
  context: Context,
  tool: 'brushStretchTool' | 'brushShearTool' | 'brushRotateTool'
): void => {
  const isSelected = context.state.toolbox.selectedSelectorToolId === tool;
  if (
    !isSelected &&
    (!(brushHistory.current instanceof CustomBrush) || isBuiltInBrush(brushHistory.current))
  ) {
    return;
  }
  context.actions.toolbox.setActiveToPreviousTool();
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : tool;
};

export const toggleForegroundColorSelectionMode = (context: Context): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'foregroundColorSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'foregroundColorSelectorTool';
};

export const toggleBackgroundColorSelectionMode = (context: Context): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'backgroundColorSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'backgroundColorSelectorTool';
};

export const toggleSymmetryMode = (context: Context): void => {
  const isSelected = context.state.toolbox.symmetryModeOn;
  context.state.toolbox.symmetryModeOn = isSelected ? false : true;
  context.state.toolbox.selectedSelectorToolId = null;
};

export const toggleSymmetryCenterSelectionMode = (context: Context): void => {
  context.actions.toolbox.setActiveToPreviousTool();
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'symmetryCenterSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'symmetryCenterSelectorTool';
  if (!isSelected) {
    // Picking a center only makes sense with symmetry visible
    context.state.toolbox.symmetryModeOn = true;
  }
};

export const setActiveToPreviousTool = (context: Context): void => {
  context.state.toolbox.previousToolId = context.state.toolbox.activeToolId;
};
