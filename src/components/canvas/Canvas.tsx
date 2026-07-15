import React, { JSX, useEffect, useRef, useState } from 'react';
import { useContextLossRecovery, useInitTool, useUndo } from './hooks';
import { useAppState } from '../../overmind';
import { getEventHandler, getMousePos } from '../../tools/util/util';
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

// Matches cursorCrossHair2.png's size (Canvas.css) and its former CSS cursor hotspot.
const CURSOR_HOTSPOT = 23;

export function Canvas({
  isZoomCanvas,
  displayScale = { x: 1, y: 1 },
}: Props): JSX.Element | null {
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

  // The native cursor is hidden over the canvas (Canvas.css) and replaced by
  // this app-drawn crosshair, instead of a custom CSS cursor image whose
  // hotspot Chromium misplaces on Windows at fractional display scaling.
  //
  // On the main canvas it's snapped to the screen center of whichever buffer
  // pixel getMousePos would report for this same event — the exact pixel any
  // overlay preview (brush stamp, shape preview, ...) paints into — so the
  // crosshair and the preview can never disagree, regardless of any residual
  // sub-pixel rounding between the two. On the zoom canvas this would be a
  // visible jump every time the mouse crosses into the next (hugely
  // magnified) buffer pixel, so there it just tracks the raw pointer.
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const updateCursorPos = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (isZoomCanvas) {
      setCursorPos({ x: event.clientX, y: event.clientY });
      return;
    }
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const cssPerBufferX = rect.width / canvas.width;
    const cssPerBufferY = rect.height / canvas.height;
    const bufferPos = getMousePos(event);
    setCursorPos({
      x: rect.left + (bufferPos.x + 0.5) * cssPerBufferX,
      y: rect.top + (bufferPos.y + 0.5) * cssPerBufferY,
    });
  };

  // Displayed size vs drawing-buffer size: WebGL always renders at the page
  // resolution (the width/height attributes below); the browser stretches
  // that buffer to this CSS size with image-rendering: pixelated.
  const CSSZoom = {
    width: state.canvas.resolution.width * displayScale.x,
    height: state.canvas.resolution.height * displayScale.y,
  };

  const canvasStyle = {
    ...CSSZoom,
    ...(state.app.isLoading ? { cursor: 'wait' } : {}),
  };

  return (
    <>
      <canvas
        className="canvas"
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
          setCursorPos(null);
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
        className="canvas canvas--overlay"
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={canvasStyle}
      />
      {cursorPos && !state.app.isLoading && (
        <div
          className="canvas-cursor"
          style={{ left: cursorPos.x - CURSOR_HOTSPOT, top: cursorPos.y - CURSOR_HOTSPOT }}
        />
      )}
    </>
  );
}
