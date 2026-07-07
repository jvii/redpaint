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
          getEventHandler(tool, 'onMouseEnter')(event);
          getEventHandler(tool, 'onMouseEnterOverlay')(event);
        }}
        onMouseLeave={(event): void => {
          getEventHandler(tool, 'onMouseLeave')(event);
          getEventHandler(tool, 'onMouseLeaveOverlay')(event);
        }}
        onMouseMove={(event): void => {
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
    </>
  );
}
