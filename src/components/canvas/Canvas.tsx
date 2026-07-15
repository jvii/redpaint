import React, { JSX, useEffect, useRef, useState } from 'react';
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
  // this app-drawn crosshair, positioned straight from clientX/Y — the same
  // coordinates the browser itself used to place the (now hidden) native
  // cursor — instead of a custom CSS cursor image, whose hotspot Chromium
  // misplaces on Windows at fractional display scaling. It tracks the raw
  // mouse position, not a canvas-buffer pixel, so it stays pointer-sized
  // (never magnified) even on the zoom canvas.
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const updateCursorPos = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    setCursorPos({ x: event.clientX, y: event.clientY });
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
