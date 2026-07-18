import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { brushHistory } from '../brush/BrushHistory';
import { CustomBrush } from '../brush/CustomBrush';
import { rotate } from '../algorithm/brushTransform';
import { Point } from '../types';

// DPaint's Rotate Any Angle (docs/brush-transforms.md, ROTATE.C), on the
// same rails as Stretch/Shear but with two deliberate upgrades: the brush
// rotates about its center (DPaint pinned the bottom-left corner — center
// matches this app's center-anchored stamps), and the drag previews the
// actual rotated bitmap instead of DPaint's XOR outline. Press fixes the
// center; the pointer's swing around it sets the angle (Shift snaps to 15°);
// release commits. Same no-mutation contract: previews are temporary
// brushes, cancel needs no restore.
export class RotateBrushTool implements Tool {
  public onInit(): void {
    overmind.actions.tool.brushRotateStart(null);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushHistory.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    // same grip as the other drags: the pointer holds the bottom-right
    // corner, which doubles as a non-degenerate initial angle reference
    const center = { x: mousePos.x - brush.width / 2, y: mousePos.y - brush.heigth / 2 };
    overmind.actions.tool.brushRotateStart({
      center,
      startAngle: pointerAngle(center, mousePos),
    });
  }

  public onMouseUp(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const rotateState = overmind.state.tool.brushRotateTool;
    if (!rotateState.center) {
      return;
    }
    const degrees = dragAngle(rotateState, getMousePos(event), event.shiftKey);
    overmind.actions.tool.brushRotateStart(null);
    overmind.actions.brush.rotateBrushBy(degrees);
    overmind.actions.toolbox.toggleBrushTransformMode('brushRotateTool');
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const brush = brushHistory.current;
    if (!(brush instanceof CustomBrush)) {
      return;
    }
    const mousePos = getMousePos(event);
    const rotateState = overmind.state.tool.brushRotateTool;
    overlayCanvasController.clear();
    if (!rotateState.center) {
      brush.drawPoints(
        [{ x: mousePos.x - brush.width / 2, y: mousePos.y - brush.heigth / 2 }],
        overlayCanvasController
      );
      drawBoundsBox(
        { x: mousePos.x - brush.width, y: mousePos.y - brush.heigth },
        brush.width,
        brush.heigth
      );
      return;
    }
    const degrees = dragAngle(rotateState, mousePos, event.shiftKey);
    overmind.actions.tool.brushRotateAngle(Math.round(degrees));
    const preview = brush.transform((b) => rotate(b, degrees));
    preview.applyMode(overmind.state.brush.mode);
    preview.drawPoints([rotateState.center], overlayCanvasController);
    // the box is the original w x h rectangle rotating with the brush (like
    // DPaint's XOR outline), not the growing axis-aligned bitmap bounds —
    // a box that rotates reads as rotation, a box that resizes reads as scale
    overlayCanvasController.selectionPolygon(
      rotatedCorners(rotateState.center, brush.width, brush.heigth, degrees)
    );
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onExitOverlay(): void {
    overlayCanvasController.clear();
  }
}

function drawBoundsBox(topLeft: Point, width: number, height: number): void {
  overlayCanvasController.selectionBox(topLeft, {
    x: topLeft.x + width - 1,
    y: topLeft.y + height - 1,
  });
}

// the brush's w x h rectangle rotated (visually clockwise) about its center
function rotatedCorners(center: Point, width: number, height: number, degrees: number): Point[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ].map((corner) => ({
    x: center.x + corner.x * cos - corner.y * sin,
    y: center.y + corner.x * sin + corner.y * cos,
  }));
}

// visual-clockwise degrees of the pointer as seen from the center
function pointerAngle(center: Point, mousePos: Point): number {
  return (Math.atan2(mousePos.y - center.y, mousePos.x - center.x) * 180) / Math.PI;
}

function dragAngle(
  rotateState: { center: Point | null; startAngle: number },
  mousePos: Point,
  snap: boolean
): number {
  if (!rotateState.center) {
    return 0;
  }
  let degrees = pointerAngle(rotateState.center, mousePos) - rotateState.startAngle;
  if (snap) {
    degrees = Math.round(degrees / 15) * 15;
  }
  // normalized for the readout; the rotation itself is periodic anyway
  if (degrees > 180) {
    degrees -= 360;
  } else if (degrees < -180) {
    degrees += 360;
  }
  return degrees;
}
