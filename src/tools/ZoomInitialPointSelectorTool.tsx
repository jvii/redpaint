import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { DEFAULT_ZOOM_WIDTH_FRACTION } from '../components/canvas/ZoomCanvas';
import { Point } from '../types';

export class ZoomInitialPointSelectorTool implements Tool {
  public onInit(): void {
    //selection.prepare(canvas);
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    overmind.actions.canvas.setZoomFocusPoint(mousePos);
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  // Overlay

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);
    const half = getZoomViewHalfSize();
    const start = { x: mousePos.x - half.x, y: mousePos.y - half.y };
    const end = { x: mousePos.x + half.x, y: mousePos.y + half.y };
    overlayCanvasController.selectionBox(start, end);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }

  public onClickOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    overlayCanvasController.clear();
  }
}

// What the box fell back to before it was computed at all, in artwork pixels.
const FALLBACK_HALF_SIZE = 30;

// Half the artwork area the zoom view is about to show, since the box is drawn
// around the pointer. Deliberately rough: the zoom pane is display:none while
// its initial point is being picked, so its width cannot be measured and the
// default share of the canvas area stands in, ignoring any divider drag.
function getZoomViewHalfSize(): Point {
  const zoomCanvas = document.querySelector<HTMLCanvasElement>('.zoom-canvas-div .canvas');
  const container = document.querySelector<HTMLElement>('.canvas-container');
  const resolution = overmind.state.canvas.resolution;
  if (!zoomCanvas || !container) {
    return { x: FALLBACK_HALF_SIZE, y: FALLBACK_HALF_SIZE };
  }
  // CSS pixels per artwork pixel, per axis (they differ on a non-square
  // pixel aspect), as the zoom canvas is sized right now
  const scaleX = parseFloat(zoomCanvas.style.width) / resolution.width;
  const scaleY = parseFloat(zoomCanvas.style.height) / resolution.height;
  if (!(scaleX > 0) || !(scaleY > 0)) {
    return { x: FALLBACK_HALF_SIZE, y: FALLBACK_HALF_SIZE };
  }
  // Rounded to whole artwork pixels, and never below 1: the box is
  // rasterized onto the canvas grid, so fractional corners put the four
  // edges on different pixel rows and the outline stops being a rectangle.
  return {
    x: Math.max(1, Math.round((container.offsetWidth * DEFAULT_ZOOM_WIDTH_FRACTION) / scaleX / 2)),
    y: Math.max(1, Math.round(container.offsetHeight / scaleY / 2)),
  };
}
