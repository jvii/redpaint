import React, { useEffect, useRef } from 'react';
import { CanvasStateAction } from './CanvasState';
import { useInitTool, useUndo } from './hooks';
import { useOvermind } from '../../overmind';
import { getEventHandler } from '../../tools/util';
import { EventHandlerParams } from '../../tools/Tool';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({ canvasDispatch, isZoomCanvas, zoomFactor = 1 }: Props): JSX.Element {
  console.log('render ' + (isZoomCanvas ? 'ZoomCanvas' : 'MainCanvas'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvas' : 'setMainCanvas',
      elements: { canvas: canvasRef.current, overlay: overlayCanvasRef.current },
    });
  }, []);

  const { state, actions } = useOvermind();

  useUndo(canvasRef.current);
  useInitTool(canvasRef.current, isZoomCanvas);

  const tool = state.toolbar.activeTool;

  const CSSZoom = {
    width: state.canvas.resolution.width * zoomFactor,
    height: state.canvas.resolution.height * zoomFactor,
  };

  const eventHandlerParams: EventHandlerParams = {
    canvas: canvasRef.current,
    onDrawToCanvas: (): void => {
      actions.canvas.setCanvasModified(isZoomCanvas);
    },
    undoPoint: (): void => {
      actions.undo.setUndoPoint(canvasRef.current);
    },
  };

  const eventHandlerParamsOverlay: EventHandlerParams = {
    canvas: overlayCanvasRef.current,
    onDrawToCanvas: (): void => {
      actions.canvas.setOverlayCanvasModified(isZoomCanvas);
    },
    undoPoint: (): void => {
      actions.undo.setUndoPoint(canvasRef.current);
    },
  };

  return (
    <div className="CanvasContainer">
      <canvas
        className="Canvas"
        ref={canvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
        onClick={(event): void => {
          getEventHandler(tool, 'onClick', eventHandlerParams)(event);
          getEventHandler(tool, 'onClickOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseDown={(event): void => {
          getEventHandler(tool, 'onMouseDown', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseDownOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseUp={(event): void => {
          getEventHandler(tool, 'onMouseUp', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseUpOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseEnter={(event): void => {
          getEventHandler(tool, 'onMouseEnter', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseEnterOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseLeave={(event): void => {
          getEventHandler(tool, 'onMouseLeave', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseLeaveOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseMove={(event): void => {
          getEventHandler(tool, 'onMouseMove', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseMoveOverlay', eventHandlerParamsOverlay)(event);
        }}
        onContextMenu={getEventHandler(tool, 'onContextMenu', eventHandlerParams)}
      />
      <canvas
        className="Canvas OverlayCanvas"
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
    </div>
  );
}
