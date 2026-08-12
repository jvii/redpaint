import { Color, Point } from '../types';
import { overmind } from '..';
import { BrushInterface } from '../brush/Brush';
import { CustomBrush } from '../brush/CustomBrush';
import { brushRecall } from '../brush/BrushRecall';
import { symmetryBrush } from '../brush/SymmetryBrush';
import { overlayCanvasController } from './overlayCanvas/OverlayCanvasController';

// The hover brush preview as DOM rather than overlay-canvas draws
// (docs/dom-hover-preview.md): on the affected Windows machine every WebGL
// commit per mousemove presents a frame late, while a transform on a composited
// DOM element tracks like the native cursor. So while merely hovering, the
// stamp is a small <canvas> per view moved by style.transform and the overlay
// is not touched; painting and dragging keep the overlay pipeline.
//
// The bitmap re-renders only when its cache key changes, never per mousemove.
// The key is built from primitives. Object identity across Overmind proxy reads
// is not dependable, which is why every cache here keys on primitives.
type PreviewView = {
  host: HTMLCanvasElement; // the painting canvas whose buffer coords position the preview
  element: HTMLCanvasElement; // the DOM element showing the brush bitmap
  cssWidth: number; // last applied CSS size — skip same-value style writes
  cssHeight: number;
};

// Buffer-pixel size of the brush's stamp. The one built-in that isn't a
// CustomBrush is the default single-pixel brush (PixelBrush, see
// overmind/brush/state.ts). Its stamp is one pixel of the active paint color.
function stampSize(brush: BrushInterface): { width: number; height: number } {
  return brush instanceof CustomBrush
    ? { width: brush.width, height: brush.heigth }
    : { width: 1, height: 1 };
}

// What the pixel brush would paint: the active paint color as displayed
// (indexed colors through the display palette, so it cycles under Tab).
function activeDisplayColor(): Color {
  const paint = overmind.state.tool.activePaintColor;
  return paint.kind === 'rgb'
    ? paint.color
    : (overmind.state.palette.displayPalette[String(paint.colorNumber)] ?? { r: 0, g: 0, b: 0 });
}

class HoverBrushPreviewController {
  private views: PreviewView[] = [];
  private shownAt: Point | null = null;
  private renderedKey: string | null = null;

  // Each Canvas view (main, and zoom when open) registers its host painting
  // canvas and its preview element; positioning maps the same buffer
  // coordinates through each host's own bounding rect, which is what makes the
  // zoom twin free. The zoom host is the same buffer at a magnified CSS size,
  // so the ghost lands magnified and pan-corrected automatically.
  register(host: HTMLCanvasElement, element: HTMLCanvasElement): () => void {
    const view: PreviewView = { host, element, cssWidth: -1, cssHeight: -1 };
    this.views.push(view);
    this.renderedKey = null; // force a bitmap render into the new element
    return (): void => {
      this.views = this.views.filter((v) => v !== view);
    };
  }

  show(bufferPos: Point): void {
    const brush = brushRecall.current;
    this.shownAt = bufferPos;
    this.renderBitmapIfStale(brush);
    const size = stampSize(brush);
    for (const view of this.views) {
      this.position(view, bufferPos, size.width, size.height);
    }
  }

  hide(): void {
    this.shownAt = null;
    for (const view of this.views) {
      view.element.style.visibility = 'hidden';
    }
  }

  // Re-render the bitmap in place (same position): CycleDriver calls this when
  // a cycling step changes the display palette while the mouse rests.
  refresh(): void {
    if (this.shownAt === null) {
      return;
    }
    this.renderBitmapIfStale(brushRecall.current);
  }

  private position(view: PreviewView, p: Point, width: number, height: number): void {
    const rect = view.host.getBoundingClientRect();
    const sx = rect.width / view.host.width;
    const sy = rect.height / view.host.height;
    const cssWidth = width * sx;
    const cssHeight = height * sy;
    if (cssWidth !== view.cssWidth || cssHeight !== view.cssHeight) {
      view.element.style.width = `${cssWidth}px`;
      view.element.style.height = `${cssHeight}px`;
      view.cssWidth = cssWidth;
      view.cssHeight = cssHeight;
    }
    // center the brush on the hovered buffer pixel's center: the DOM equivalent
    // of CustomBrush.adjustHandle's point - size/2
    const x = rect.left + (p.x + 0.5) * sx - cssWidth / 2;
    const y = rect.top + (p.y + 0.5) * sy - cssHeight / 2;
    view.element.style.transform = `translate(${x}px, ${y}px)`;
    view.element.style.visibility = 'visible';
  }

  // Everything the bitmap depends on, as primitives. cycleOffsets covers
  // Tab-cycling steps; lastUndoPointTime covers palette edits (the palette
  // editor's OK commits an undo point when colors changed); lastChanged
  // covers brush switches, transforms and recoloring; the resolved active
  // color covers the pixel brush's FG/BG changes.
  private bitmapKey(brush: BrushInterface): string {
    const shared = `${overmind.state.brush.mode}|${overmind.state.palette.cycleOffsets.join(
      ','
    )}|${overmind.state.undo.lastUndoPointTime}`;
    if (brush instanceof CustomBrush) {
      return `c|${brush.lastChanged}|${shared}`;
    }
    const rgb = activeDisplayColor();
    return `p|${rgb.r},${rgb.g},${rgb.b}|${shared}`;
  }

  private renderBitmapIfStale(brush: BrushInterface): void {
    const key = this.bitmapKey(brush);
    if (key === this.renderedKey) {
      return;
    }
    let image: ImageData;
    if (brush instanceof CustomBrush) {
      image = brush.toDisplayImageData();
    } else {
      const rgb = activeDisplayColor();
      image = new ImageData(new Uint8ClampedArray([rgb.r, rgb.g, rgb.b, 255]), 1, 1);
    }
    for (const view of this.views) {
      view.element.width = image.width;
      view.element.height = image.height;
      view.element.getContext('2d')?.putImageData(image, 0, 0);
      view.cssWidth = -1; // element sizing resets when its backing store does
      view.cssHeight = -1;
    }
    this.renderedKey = key;
  }
}

export const hoverBrushPreview = new HoverBrushPreviewController();

// The resting-state hover stamp, for the tools whose only buttons-up overlay
// draw is "the brush at the pointer". The DOM path where it can be, the overlay
// draw where it can't: with symmetry on the preview is N kaleidoscope copies,
// which stays on the canvas. Tools whose hover draws more than the stamp (the
// shape tools' aiming crosshair) do not come through here.
export function drawHoverBrushStamp(mousePos: Point): void {
  if (overmind.state.toolbox.symmetryModeOn) {
    hoverBrushPreview.hide();
    symmetryBrush.drawPoints([mousePos], overlayCanvasController);
    return;
  }
  // the overlay's last composited frame stays visible until something new
  // composites. Clear a stale canvas stamp once when taking the DOM path (never
  // per move; the flag makes this a no-op while the overlay is clean)
  if (overlayCanvasController.hasContentOnScreen()) {
    overlayCanvasController.clear();
  }
  hoverBrushPreview.show(mousePos);
}
