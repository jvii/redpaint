import React, { JSX, useEffect, useRef } from 'react';
import { useContextLossRecovery, useInitTool, useUndo } from './hooks';
import { useAppState } from '../../overmind';
import { getEventHandler } from '../../tools/util/util';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Point } from '../../types';
import './Canvas.css';

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

export function Canvas({ isZoomCanvas, displayScale = { x: 1, y: 1 } }: Props): JSX.Element | null {
  const state = useAppState();

  console.log('render ' + (isZoomCanvas ? 'ZoomCanvas' : 'MainCanvas'));
  const paintingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect((): (() => void) => {
    console.log('Canvas component mounted', isZoomCanvas ? 'zoom' : 'main');
    if (isZoomCanvas) {
      paintingCanvasController.attachZoomCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachZoomCanvas(overlayCanvasRef.current);
    } else {
      paintingCanvasController.attachMainCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachMainCanvas(overlayCanvasRef.current);
    }

    // Cleanup function to dispose of WebGL resources when component unmounts
    return () => {
      console.log('Canvas component unmounting', isZoomCanvas ? 'zoom' : 'main');
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

  useUndo();

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
  // A captured/loaded (non-built-in) brush is usually large enough that
  // exact hotspot alignment barely matters, so there it's skipped entirely —
  // no per-mousemove work at all, and the native pointer shows instead — to
  // keep dragging a big brush around (e.g. drawing a line with it) cheap.
  const usePreciseCursor = state.brush.selectedBuiltInBrushId !== null;
  // Positioned by directly mutating the DOM through this ref, not React
  // state: the native cursor moves via the OS/browser compositor with zero
  // JS involved, and a setState here would mean a full Canvas re-render (two
  // <canvas> elements included) on every single mousemove, plus left/top
  // triggers layout — both add latency a native cursor never pays, which
  // reads as jerkiness at typical mousemove rates. transform + visibility
  // are compositor-only, no layout/re-render, keeping this as close to the
  // native cursor's smoothness as an app-drawn element can get.
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

  // Displayed size vs drawing-buffer size: WebGL always renders at the page
  // resolution (the width/height attributes below); the browser stretches
  // that buffer to this CSS size with image-rendering: pixelated.
  const CSSZoom = {
    width: state.canvas.resolution.width * displayScale.x,
    height: state.canvas.resolution.height * displayScale.y,
  };

  // An armed brush transform shows the matching cursor — the conventional
  // "dragging will reshape" affordance (diagonal resize for Stretch,
  // horizontal for Shear, a circular arrow for Rotate — CSS has no rotate
  // cursor, so it's a pixel-art data URI like the crosshair above).
  // Transforms imply a custom brush, so they never compete with the precise
  // (built-in-brush) crosshair.
  const transformCursor =
    state.toolbox.selectedSelectorToolId === 'brushStretchTool'
      ? 'nwse-resize'
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
        : usePreciseCursor
          ? { cursor: 'none' }
          : {}),
  };
  const canvasClassName = 'canvas' + (usePreciseCursor ? '' : ' canvas--native-crosshair-cursor');

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
          getEventHandler(tool, 'onClickOverlay')(event);
        }}
        onMouseDown={(event): void => {
          getEventHandler(tool, 'onMouseDown')(event);
          getEventHandler(tool, 'onMouseDownOverlay')(event);
        }}
        onMouseUp={(event): void => {
          getEventHandler(tool, 'onMouseUp')(event);
          getEventHandler(tool, 'onMouseUpOverlay')(event);
        }}
        onMouseEnter={(event): void => {
          updateCursorPos(event);
          getEventHandler(tool, 'onMouseEnter')(event);
          getEventHandler(tool, 'onMouseEnterOverlay')(event);
        }}
        onMouseLeave={(event): void => {
          hideCursor();
          getEventHandler(tool, 'onMouseLeave')(event);
          getEventHandler(tool, 'onMouseLeaveOverlay')(event);
        }}
        onMouseMove={(event): void => {
          updateCursorPos(event);
          getEventHandler(tool, 'onMouseMove')(event);
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
      {usePreciseCursor && !state.app.isLoading && (
        <div ref={cursorRef} className="canvas-cursor" />
      )}
    </>
  );
}
