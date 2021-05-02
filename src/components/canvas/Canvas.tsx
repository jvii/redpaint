import React, { useEffect, useRef } from 'react';
import { useInitTool, useUndo } from './hooks';
import { useOvermind } from '../../overmind';
import { getEventHandler } from '../../tools/util/util';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import './Canvas.css';

interface Props {
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({ isZoomCanvas, zoomFactor = 1 }: Props): JSX.Element | null {
  console.log('render ' + (isZoomCanvas ? 'ZoomCanvas' : 'MainCanvas'));
  const paintingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect((): void => {
    if (isZoomCanvas) {
      paintingCanvasController.attachZoomCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachZoomCanvas(overlayCanvasRef.current);
    } else {
      paintingCanvasController.attachMainCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachMainCanvas(overlayCanvasRef.current);
    }
  }, []);

  useUndo();
  useInitTool(isZoomCanvas);

  const { state } = useOvermind();
  const tool = state.toolbox.activeTool;

  const CSSZoom = {
    width: state.canvas.resolution.width * zoomFactor,
    height: state.canvas.resolution.height * zoomFactor,
  };

  return (
    <>
      <canvas
        className="canvas"
        ref={paintingCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
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
        onContextMenu={getEventHandler(tool, 'onContextMenu')}
      />
      <canvas
        className="canvas canvas--overlay"
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
    </>
  );
}
