import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushRecall } from '../brush/BrushRecall';
import { CustomBrush } from '../brush/CustomBrush';
import { refreshBrushPreview } from '../components/GlobalHotkeyManager';

export class BrushSelector implements Tool {
  public onInit(): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      return;
    }

    const mousePos = getMousePos(event);

    // normalize to a top-left anchor with inclusive dimensions: the selection
    // covers both corner pixels regardless of drag direction
    const topLeft = {
      x: Math.min(start.x, mousePos.x),
      y: Math.min(start.y, mousePos.y),
    };
    const width = Math.abs(mousePos.x - start.x) + 1;
    const height = Math.abs(mousePos.y - start.y) + 1;

    // The corner the drag ended at, in the brush's own pixels — what Brush
    // Handle holds the brush by (docs/brush-handle.md). DPaint's own rule,
    // MAX(0, mx - sx) in MODES.C's DoSelBr: dragging right or down gives the
    // far edge, and the MAX is what collapses the other direction to zero.
    const handlePoint = {
      x: Math.max(0, mousePos.x - start.x),
      y: Math.max(0, mousePos.y - start.y),
    };

    const customBrush = CustomBrush.fromCanvasArea(topLeft, width, height, handlePoint);
    brushRecall.setCustom(customBrush);
    overmind.actions.brush.clearBuiltInBrushSelection();
    overmind.actions.brush.setMode('Matte');
    // Back to the centre for a brush picked up here. A capture has no opinion
    // about centre-versus-corner — it records which corner, not whether to use
    // one — and the setting it would otherwise inherit may have come from a
    // loaded file rather than from anyone choosing it (docs/brush-handle.md).
    // The corner above is kept either way, so Corner is one click from here.
    overmind.actions.brush.setHandleMode('center');
    overmind.actions.brush.refreshPreviousBrushSlot();

    // exit brush selection tool
    overmind.actions.toolbox.toggleBrushSelectionMode();
    // switch to Dotted Freehand tool after selection
    overmind.actions.toolbox.setSelectedDrawingTool('dottedFreehand');
    // the tool switch above only takes effect once Canvas.tsx re-renders and
    // rebinds its onMouseMove closure to the new tool, so a refresh called
    // synchronously here would still hit the outgoing tool's stale handler,
    // same reasoning as the keyboard hotkey path in GlobalHotkeyManager.tsx
    setTimeout(refreshBrushPreview, 0);
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.tool.brushSelectionStart(mousePos);
  }

  public onMouseLeave(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overmind.actions.tool.brushSelectionStart(null);
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const start = overmind.state.tool.brushSelectorTool.start;
    if (!start) {
      overlayCanvasController.selectionCrosshair(mousePos);
      return;
    }
    overlayCanvasController.selectionBox(start, mousePos);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onMouseUpOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}
