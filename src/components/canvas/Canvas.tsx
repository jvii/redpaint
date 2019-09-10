import React, { useEffect, useReducer, useRef } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { UndoState, UndoStateAction } from './UndoState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import { useZoomToolInitialSelection, useUndo } from './hooks';
import { getEventHandler } from '../../tools/util';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
  undoState: UndoState;
  undoDispatch: React.Dispatch<UndoStateAction>;
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
  undoState,
  undoDispatch,
  isZoomCanvas,
  zoomFactor = 1,
}: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, new ToolState());

  const canvasId = isZoomCanvas ? 'zoomCanvas' : 'mainCanvas';

  useEffect((): void => {
    if (canvasState.lastModified.modifiedBy === canvasId) {
      return;
    }
    copyToCanvas(canvasState.sourceCanvas, canvasRef.current);
  }, [canvasState.lastModified.timestamp]);

  useEffect((): void => {
    if (canvasState.lastModifiedOverlay.modifiedBy === canvasId) {
      return;
    }
    copyToCanvas(canvasState.sourceOverlayCanvas, overlayCanvasRef.current);
  }, [canvasState.lastModifiedOverlay.timestamp]);

  const [setUndoPoint] = useUndo(undoState, undoDispatch, canvasRef.current);
  // TODO: move undo to canvasState?
  useEffect((): void => {
    if (isZoomCanvas) {
      return;
    }
    setUndoPoint(); // initial undo point
  }, [canvasRef.current]);

  useEffect((): void => {
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolbarState]);

  useZoomToolInitialSelection(
    isZoomCanvas,
    toolbarState,
    canvasDispatch,
    toolState,
    toolStateDispatch
  );

  const CSSZoom = {
    width: canvasState.resolution.width * zoomFactor,
    height: canvasState.resolution.height * zoomFactor,
  };

  const eventHandlerParams = {
    canvas: canvasRef.current,
    onDrawToCanvas: (): void =>
      canvasDispatch({
        type: 'setModified',
        canvas: canvasRef.current,
        modifiedBy: canvasId,
      }),
    undoPoint: (): void => setUndoPoint(),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  const eventHandlerParamsOverlay = {
    canvas: overlayCanvasRef.current,
    onDrawToCanvas: (): void =>
      canvasDispatch({
        type: 'setOverlayModified',
        canvas: overlayCanvasRef.current,
        modifiedBy: canvasId,
      }),
    undoPoint: (): void => setUndoPoint(),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  const tool = toolState.activeTool;

  return (
    <div className="CanvasContainer">
      <canvas
        className="Canvas"
        ref={canvasRef}
        width={canvasState.resolution.width}
        height={canvasState.resolution.height}
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
        width={canvasState.resolution.width}
        height={canvasState.resolution.height}
        style={CSSZoom}
      />
    </div>
  );
}

function copyToCanvas(sourceCanvas: HTMLCanvasElement, targetCanvas: HTMLCanvasElement): void {
  const targetContext = targetCanvas.getContext('2d');
  if (targetContext) {
    targetContext.clearRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);
    targetContext.drawImage(sourceCanvas, 0, 0);
  }
}

export default Canvas;
