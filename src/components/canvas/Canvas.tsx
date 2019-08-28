import React, { useEffect, useReducer, useRef } from 'react';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { ToolState, toolStateReducer } from '../../tools/ToolState';
import { useCanvasSync, useZoomToolInitialSelection } from './hooks';
import { getEventHandler } from '../../tools/util';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
  isZoomCanvas,
  zoomFactor = 1,
}: Props): JSX.Element {
  const [toolState, toolStateDispatch] = useReducer(toolStateReducer, new ToolState());
  useEffect((): void => {
    toolStateDispatch({ type: 'setActiveTool', tool: toolbarState.selectedTool });
  }, [toolbarState]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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

  const syncTargetCanvas = isZoomCanvas ? canvasState.mainCanvasRef : canvasState.zoomCanvasRef;
  const syncTargetOverlayCanvas = isZoomCanvas
    ? canvasState.mainOverlayCanvasRef
    : canvasState.zoomOverlayCanvasRef;
  const [setCanvasSyncPoint] = useCanvasSync(canvasRef, syncTargetCanvas, toolbarState);
  const [setOverlayCanvasSyncPoint] = useCanvasSync(
    overlayCanvasRef,
    syncTargetOverlayCanvas,
    toolbarState
  );

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
    canvas: canvasRef.current,
    onDrawToCanvas: (): void => setCanvasSyncPoint(Date.now()),
    paletteState: paletteState,
    toolState: toolState,
    toolStateDispatch: toolStateDispatch,
  };

  const eventHandlerParamsOverlay = {
    canvas: overlayCanvasRef.current,
    onDrawToCanvas: (): void => setOverlayCanvasSyncPoint(Date.now()),
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
        onClick={getEventHandler(tool, 'onClick', eventHandlerParams)}
        onContextMenu={getEventHandler(tool, 'onContextMenu', eventHandlerParams)}
        onMouseDown={getEventHandler(tool, 'onMouseDown', eventHandlerParams)}
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
