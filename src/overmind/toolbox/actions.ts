import { Context } from '../../overmind';
import { DrawingToolId } from './state';
import { brushRecall } from '../../brush/BrushRecall';
import { CustomBrush } from '../../brush/CustomBrush';
import { isBuiltInBrush } from '../brush/state';
import type { BrushTransformToolId } from './brushTransformTools';

export const setSelectedDrawingTool = (context: Context, toolId: DrawingToolId): void => {
  context.state.toolbox.selectedDrawingToolId = toolId;
  context.state.toolbox.selectedSelectorToolId = null;
};

export const toggleZoomMode = (context: Context): void => {
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
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'brushSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'brushSelectorTool';
};

// The interactive brush transforms (docs/brush-transforms.md): modal drags
// on the canvas, so they ride the selector-tool slot like brush selection
// does. Custom brushes only, like every transform. Toggling one while the
// other is armed switches directly.
export type { BrushTransformToolId };

export const toggleBrushTransformMode = (context: Context, tool: BrushTransformToolId): void => {
  const isSelected = context.state.toolbox.selectedSelectorToolId === tool;
  if (
    !isSelected &&
    (!(brushRecall.current instanceof CustomBrush) || isBuiltInBrush(brushRecall.current))
  ) {
    return;
  }
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : tool;
};

// Right-click on a built-in brush icon (BuiltInBrushes.tsx), DPaint's SizePen
// (MODES.C). A separate resize path from the customs-only Stretch above, so it
// enters unconditionally re-anchored to whichever icon was clicked, rather than
// toggling off if already active (a second right-click on a different icon
// should re-target the drag, not exit the mode).
export const enterSizeBuiltInBrushMode = (context: Context): void => {
  // Guards against a stuck mode (resize cursor armed, drag a no-op) if the
  // brush that just got selected still isn't a resizable built-in for any
  // reason, same defensive shape as toggleBrushTransformMode's guard above.
  if (!(brushRecall.current instanceof CustomBrush) || !isBuiltInBrush(brushRecall.current)) {
    return;
  }
  context.state.toolbox.selectedSelectorToolId = 'sizeBuiltInBrushTool';
  // The readout, here rather than in the tool's onInit: re-targeting from one
  // preset to another leaves the active tool unchanged, so onInit does not run
  // again and the size would stand at the preset armed first.
  context.actions.tool.sizeBuiltInBrushSize({
    width: brushRecall.current.width,
    height: brushRecall.current.heigth,
  });
};

export const exitSizeBuiltInBrushMode = (context: Context): void => {
  context.state.toolbox.selectedSelectorToolId = null;
};

export const toggleForegroundColorSelectionMode = (context: Context): void => {
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'foregroundColorSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'foregroundColorSelectorTool';
};

export const toggleBackgroundColorSelectionMode = (context: Context): void => {
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'backgroundColorSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'backgroundColorSelectorTool';
};

export const toggleSymmetryMode = (context: Context): void => {
  const isSelected = context.state.toolbox.symmetryModeOn;
  context.state.toolbox.symmetryModeOn = isSelected ? false : true;
  context.state.toolbox.selectedSelectorToolId = null;
};

export const toggleSymmetryCenterSelectionMode = (context: Context): void => {
  const isSelected = context.state.toolbox.selectedSelectorToolId === 'symmetryCenterSelectorTool';
  context.state.toolbox.selectedSelectorToolId = isSelected ? null : 'symmetryCenterSelectorTool';
  if (!isSelected) {
    // Picking a center only makes sense with symmetry visible
    context.state.toolbox.symmetryModeOn = true;
  }
};
