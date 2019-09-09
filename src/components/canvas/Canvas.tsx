import React, { useEffect, useReducer, useRef } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { UndoState, UndoStateAction } from './UndoState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import { useCanvasSync, useZoomToolInitialSelection, useUndo } from './hooks';
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
  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, new ToolState());
  useEffect((): void => {
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolbarState]);

  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  //const localOverlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvasRef' : 'setMainCanvasRef',
      canvas: canvasRef.current,
    });
  }, [canvasRef, canvasDispatch]);
  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomOverlayCanvasRef' : 'setMainOverlayCanvasRef',
      canvas: overlayCanvasRef.current,
    });
  }, [overlayCanvasRef, canvasDispatch]);

  const [setCanvasSyncPoint] = useCanvasSync(
    canvasRef.current,
    isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef,
    toolbarState
  );
  const [setOverlayCanvasSyncPoint] = useCanvasSync(
    overlayCanvasRef.current,
    isZoomCanvas ? canvasState.mainOverlayCanvasRef : canvasState.zoomOverlayCanvasRef,
    toolbarState
  );

  const [setUndoPoint] = useUndo(
    undoState,
    undoDispatch,
    isZoomCanvas ? canvasState.zoomCanvasRef : canvasState.mainCanvasRef
  );
  useEffect((): void => {
    if (isZoomCanvas) {
      return;
    }
    setUndoPoint(); // initial undo point
  }, [canvasRef.current]);

  useZoomToolInitialSelection(
    isZoomCanvas,
    toolbarState,
    canvasDispatch,
    toolState,
    toolStateDispatch
  );

  const CSSZoom = {
    width: canvasState.canvasResolution.width * zoomFactor,
    height: canvasState.canvasResolution.height * zoomFactor,
  };

  const eventHandlerParams = {
    canvas: isZoomCanvas ? canvasState.zoomCanvasRef : canvasState.mainCanvasRef,
    onDrawToCanvas: (): void => setCanvasSyncPoint(Date.now()),
    undoPoint: (): void => setUndoPoint(),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  const eventHandlerParamsOverlay = {
    canvas: isZoomCanvas ? canvasState.zoomOverlayCanvasRef : canvasState.mainOverlayCanvasRef,
    onDrawToCanvas: (): void => setOverlayCanvasSyncPoint(Date.now()),
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
        width={canvasState.canvasResolution.width}
        height={canvasState.canvasResolution.height}
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
        width={canvasState.canvasResolution.width}
        height={canvasState.canvasResolution.height}
        style={CSSZoom}
      />
    </div>
  );
}

export default Canvas;
