import React, { useEffect, useReducer, useRef } from 'react';
import { CanvasStateAction } from './CanvasState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import { useZoomFocusPointSelection, useBrushSelection } from './hooks';
import { useOvermind } from '../../overmind';
import { getEventHandler } from '../../tools/util';
import { blobToCanvas } from './util';
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

  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, new ToolState());

  const { state, actions } = useOvermind();

  useEffect((): void => {
    blobToCanvas(state.undo.currentBufferItem, canvasRef.current);
  }, [state.undo.lastUndoRedoTime]);

  useZoomFocusPointSelection(toolState); // yhteinen useSelectionHooks?
  useBrushSelection(toolState);

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
    setSelectionComplete: (): void => {
      actions.toolbar.setSelectionComplete();
    },
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
    state: state,
  };

  const eventHandlerParamsOverlay: EventHandlerParams = {
    canvas: overlayCanvasRef.current,
    onDrawToCanvas: (): void => {
      actions.canvas.setOverlayCanvasModified(isZoomCanvas);
    },
    undoPoint: (): void => {
      actions.undo.setUndoPoint(canvasRef.current);
    },
    setSelectionComplete: (): void => {
      actions.toolbar.setSelectionComplete();
    },
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
    state: state,
  };

  const tool = state.toolbar.activeTool;

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
        onContextMenu={getEventHandler(tool, 'onContextMenu', eventHandlerParams)}
        onMouseDown={(event): void => {
          getEventHandler(tool, 'onMouseDown', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseDownOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseUp={getEventHandler(tool, 'onMouseUp', eventHandlerParams)}
        onMouseEnter={getEventHandler(tool, 'onMouseEnter', eventHandlerParams)}
        onMouseLeave={(event): void => {
          getEventHandler(tool, 'onMouseLeave', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseLeaveOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseMove={(event): void => {
          getEventHandler(tool, 'onMouseMove', eventHandlerParams)(event);
          getEventHandler(tool, 'onMouseMoveOverlay', eventHandlerParamsOverlay)(event);
        }}
      />
      <canvas
        className="OverlayCanvas Canvas"
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
    </div>
  );
}
