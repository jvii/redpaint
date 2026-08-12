import React, { JSX, useEffect, useRef } from 'react';
import { useContextLossRecovery, useInitTool, useUndo } from './hooks';
import { useAppState } from '../../overmind';
import { getEventHandler, isMiddleMouseButton } from '../../tools/util/util';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { hoverBrushPreview } from '../../canvas/hoverBrushPreview';
import { Point } from '../../types';
import './Canvas.css';
import { CropOverlay } from '../crop/CropOverlay';

interface Props {
  isZoomCanvas: boolean;
  // CSS pixels per buffer pixel, per axis. The zoom view passes a uniform
  // magnification; the main view passes the screen-format display scale,
  // which can differ per axis (non-square pixels).
  displayScale?: Point;
}

// cursorCrossHair.svg's viewBox size (Canvas.css). Its hotspot is this
// halved: the crosshair div's left/top set its corner, not its center, so
// the true center needs locating explicitly.
const CURSOR_HOTSPOT = 47 / 2;

// Pixel-art circular-arrow cursor for the armed brush rotate (CSS ships no
// rotate cursor): a square ring open at the bottom-left with an arrowhead,
// white pixels with a dark outline color so it reads on any canvas.
const ROTATE_CURSOR = ((): string => {
  const rects = [
    // ring: top, right, bottom, and the upper part of the left side
    [4, 2, 8, 2],
    [12, 4, 2, 8],
    [4, 12, 8, 2],
    [2, 4, 2, 5],
    // arrowhead at the left side's open end, pointing down
    [0, 9, 6, 2],
    [2, 11, 2, 2],
  ]
    .map(
      ([x, y, w, h]) =>
        `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='%23eeeeee' stroke='%23333333' stroke-width='0.5'/>`
    )
    .join('');
  return `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' shape-rendering='crispEdges'%3e${rects}%3c/svg%3e") 8 8, auto`;
})();

// Diagonal double-headed arrow for the Stretch / SizeBuiltInBrushTool resize
// indicator: a smooth vector glyph in the conventional OS resize-cursor look,
// not the pixel-art style of ROTATE_CURSOR. A positioned element
// (.canvas-resize-cursor) rather than a native `cursor`, since it renders offset
// from the pointer (RESIZE_CURSOR_OFFSET) instead of centered on it.
const RESIZE_CURSOR_SIZE = 24;
const RESIZE_CURSOR_ICON = ((): string => {
  // One arrow shape, drawn up-down and rotated 45 degrees about the icon's
  // center: the rotation keeps it exactly symmetric, which authoring the
  // diagonal directly would not.
  const arrow = 'M0,-9 4,-4 1.5,-4 1.5,4 4,4 0,9 -4,4 -1.5,4 -1.5,-4 -4,-4 Z';
  // scale(-1,1) mirrors the rotated diagonal horizontally about the icon's
  // own center (applied after rotate, since SVG transforms compose
  // right-to-left) — flips the arrow from a nwse to a nesw diagonal.
  const path = `<path d='${arrow}' transform='translate(12,12) scale(-1,1) rotate(45)' fill='%23eeeeee' stroke='%23333333' stroke-width='1'/>`;
  return `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='${RESIZE_CURSOR_SIZE}' height='${RESIZE_CURSOR_SIZE}' viewBox='0 0 ${RESIZE_CURSOR_SIZE} ${RESIZE_CURSOR_SIZE}'%3e${path}%3c/svg%3e")`;
})();

// How far past the pointer (down-right, CSS px) the resize indicator draws. The
// brush preview's box is anchored so the pointer sits on its bottom-right
// corner and its content up-left of that, so any positive offset clears it.
const RESIZE_CURSOR_OFFSET = 16;

export function Canvas({ isZoomCanvas, displayScale = { x: 1, y: 1 } }: Props): JSX.Element | null {
  const state = useAppState();

  const paintingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const hoverBrushRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect((): (() => void) => {
    if (isZoomCanvas) {
      paintingCanvasController.attachZoomCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachZoomCanvas(overlayCanvasRef.current);
    } else {
      paintingCanvasController.attachMainCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachMainCanvas(overlayCanvasRef.current);
    }
    // Both views register: the same buffer coordinates position each view's
    // preview through its own host rect, which is what gives the zoom view
    // its magnified hover ghost (docs/dom-hover-preview.md).
    const unregisterHoverPreview = hoverBrushPreview.register(
      paintingCanvasRef.current,
      hoverBrushRef.current
    );

    // Cleanup function to dispose of WebGL resources when component unmounts
    return () => {
      unregisterHoverPreview();
      if (isZoomCanvas) {
        // Clean up zoom canvas resources
        paintingCanvasController.disposeZoomCanvas();
        overlayCanvasController.disposeZoomCanvas();
      } else {
        // Clean up main canvas resources
        paintingCanvasController.disposeMainCanvas();
        overlayCanvasController.disposeMainCanvas();
      }
    };
  }, []);

  useUndo(isZoomCanvas);

  useInitTool(isZoomCanvas);

  useContextLossRecovery(paintingCanvasRef, overlayCanvasRef, isZoomCanvas);

  const tool = state.toolbox.activeTool;

  // The native cursor is hidden over the canvas and replaced by this
  // app-drawn crosshair, instead of a custom CSS cursor image whose hotspot
  // Chromium misplaces on Windows at fractional display scaling.
  //
  // On the main canvas it's snapped to the screen center of whichever buffer
  // pixel getMousePos would report for this same event — the exact pixel any
  // overlay preview (brush stamp, shape preview, ...) paints into — so the
  // crosshair and the preview can never disagree, regardless of any residual
  // sub-pixel rounding between the two. On the zoom canvas this would be a
  // visible jump every time the mouse crosses into the next (hugely
  // magnified) buffer pixel, so there it just tracks the raw pointer.
  //
  // Skipped entirely for a captured or loaded brush, which is usually large
  // enough that exact hotspot alignment barely matters: no per-mousemove work,
  // and the native pointer shows instead. Suppressed while
  // SizeBuiltInBrushTool is armed too — selectedBuiltInBrushId stays set
  // through that drag, but the resize cursor is what should show.
  const usePreciseCursor =
    state.brush.selectedBuiltInBrushId !== null &&
    state.toolbox.selectedSelectorToolId !== 'sizeBuiltInBrushTool';
  // Positioned by mutating the DOM through this ref, not React state: a
  // setState would re-render the whole Canvas on every mousemove, and left/top
  // trigger layout. Both add latency a native cursor never pays, and it reads
  // as jerkiness. transform + visibility are compositor-only.
  const cursorRef = useRef<HTMLDivElement>(null);
  const updateCursorPos = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!usePreciseCursor || !cursorRef.current) {
      return;
    }
    let x: number;
    let y: number;
    if (isZoomCanvas) {
      x = event.clientX;
      y = event.clientY;
    } else {
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const cssPerBufferX = rect.width / canvas.width;
      const cssPerBufferY = rect.height / canvas.height;
      const bufferX = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
      const bufferY = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
      x = rect.left + (bufferX + 0.5) * cssPerBufferX;
      y = rect.top + (bufferY + 0.5) * cssPerBufferY;
    }
    cursorRef.current.style.transform = `translate(${x - CURSOR_HOTSPOT}px, ${y - CURSOR_HOTSPOT}px)`;
    cursorRef.current.style.visibility = 'visible';
  };
  const hideCursor = (): void => {
    if (cursorRef.current) {
      cursorRef.current.style.visibility = 'hidden';
    }
  };

  // The Stretch/SizeBuiltInBrushTool resize indicator (see RESIZE_CURSOR_ICON
  // above): unlike the precise crosshair, this doesn't need buffer-pixel
  // snapping — it's a decorative corner indicator, not a paint-target
  // marker — so it just follows the raw client position, offset.
  const showResizeCursor =
    !state.app.isLoading &&
    (state.toolbox.selectedSelectorToolId === 'brushStretchTool' ||
      state.toolbox.selectedSelectorToolId === 'sizeBuiltInBrushTool');
  const resizeCursorRef = useRef<HTMLDivElement>(null);
  const updateResizeCursorPos = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!showResizeCursor || !resizeCursorRef.current) {
      return;
    }
    resizeCursorRef.current.style.transform = `translate(${event.clientX + RESIZE_CURSOR_OFFSET}px, ${event.clientY + RESIZE_CURSOR_OFFSET}px)`;
    resizeCursorRef.current.style.visibility = 'visible';
  };
  const hideResizeCursor = (): void => {
    if (resizeCursorRef.current) {
      resizeCursorRef.current.style.visibility = 'hidden';
    }
  };

  // Displayed size vs drawing-buffer size: WebGL always renders at the page
  // resolution (the width/height attributes below); the browser stretches
  // that buffer to this CSS size with image-rendering: pixelated.
  const CSSZoom = {
    width: state.canvas.resolution.width * displayScale.x,
    height: state.canvas.resolution.height * displayScale.y,
  };

  // An armed brush transform shows the matching cursor — the conventional
  // "dragging will reshape" affordance (diagonal resize for Stretch and its
  // built-in-brush counterpart SizeBuiltInBrushTool, horizontal for Shear, a
  // circular arrow for Rotate — CSS has no rotate cursor, so it's a
  // pixel-art data URI like the crosshair above).
  const transformCursor = showResizeCursor
    ? null // native cursor hidden; .canvas-resize-cursor draws the indicator instead, offset clear of the brush
    : state.toolbox.selectedSelectorToolId === 'brushShearTool'
      ? 'ew-resize'
      : state.toolbox.selectedSelectorToolId === 'brushRotateTool'
        ? ROTATE_CURSOR
        : state.toolbox.selectedSelectorToolId === 'brushBendHorizontalTool'
          ? 'ew-resize'
          : state.toolbox.selectedSelectorToolId === 'brushBendVerticalTool'
            ? 'ns-resize'
            : null;
  const canvasStyle = {
    ...CSSZoom,
    ...(state.app.isLoading
      ? { cursor: 'wait' }
      : transformCursor
        ? { cursor: transformCursor }
        : usePreciseCursor || showResizeCursor
          ? { cursor: 'none' }
          : {}),
  };
  const canvasClassName =
    'canvas' + (usePreciseCursor || showResizeCursor ? '' : ' canvas--native-crosshair-cursor');

  return (
    <>
      <canvas
        className={canvasClassName}
        ref={paintingCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={canvasStyle}
        onClick={(event): void => {
          getEventHandler(tool, 'onClick')(event);
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onClickOverlay')(event);
        }}
        onMouseDown={(event): void => {
          if (isMiddleMouseButton(event)) {
            return; // reserved app-wide for the menu toggle, not a paint tool
          }
          // the drag's own preview takes over from the DOM hover ghost
          hoverBrushPreview.hide();
          getEventHandler(tool, 'onMouseDown')(event);
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onMouseDownOverlay')(event);
        }}
        onMouseUp={(event): void => {
          if (isMiddleMouseButton(event)) {
            return;
          }
          getEventHandler(tool, 'onMouseUp')(event);
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onMouseUpOverlay')(event);
          // Drawing tools skip onMouseMoveOverlay while a button is held (the
          // real canvas shows the live stroke), so mouse-up leaves the overlay
          // cleared until the pointer next moves. Replay one so the brush
          // cursor comes back immediately.
          setTimeout(refreshBrushPreview, 0);
        }}
        onMouseEnter={(event): void => {
          updateCursorPos(event);
          updateResizeCursorPos(event);
          getEventHandler(tool, 'onMouseEnter')(event);
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onMouseEnterOverlay')(event);
        }}
        onMouseLeave={(event): void => {
          hideCursor();
          hideResizeCursor();
          hoverBrushPreview.hide();
          getEventHandler(tool, 'onMouseLeave')(event);
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onMouseLeaveOverlay')(event);
        }}
        onMouseMove={(event): void => {
          updateCursorPos(event);
          updateResizeCursorPos(event);
          getEventHandler(tool, 'onMouseMove')(event);
          // Each mouse event's overlay draws (possibly several — a gradient
          // fill preview issues one call per color band) replace the
          // previous frame's, so CycleDriver's replay doesn't accumulate
          // stale draws from earlier positions.
          overlayCanvasController.beginFrame();
          getEventHandler(tool, 'onMouseMoveOverlay')(event);
        }}
        onContextMenu={(event): void => {
          getEventHandler(tool, 'onContextMenu')(event);
        }}
      />
      <canvas
        className={canvasClassName + ' canvas--overlay'}
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={canvasStyle}
      />
      {!isZoomCanvas && state.crop.rect && <CropOverlay displayScale={displayScale} />}
      {/* always mounted (registration is tied to the component's lifetime);
          shown/hidden imperatively by hoverBrushPreview like the cursor div */}
      <canvas ref={hoverBrushRef} className="canvas-hover-brush" />
      {usePreciseCursor && !state.app.isLoading && (
        <div ref={cursorRef} className="canvas-cursor" />
      )}
      {showResizeCursor && (
        <div
          ref={resizeCursorRef}
          className="canvas-resize-cursor"
          style={{ backgroundImage: RESIZE_CURSOR_ICON }}
        />
      )}
    </>
  );
}
